const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.ASTRA_URL || 'http://localhost:4180';
const output = process.env.ASTRA_RESULTS || path.resolve(__dirname, '../test-results');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const errors = [];
  const report = { checks: [], performance: {}, limitations: ['Mobile emulation is not a physical mobile GPU benchmark.'] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const snapshot = () => page.evaluate(() => window.__astra.snapshot());
  const state = () => page.evaluate(() => window.__astra.sampleSimulation());
  await page.goto(base + '/?debug=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__astra?.snapshot().renderCount > 30);
  assert.equal((await snapshot()).simulation, true, 'test GPU must support FBO');
  assert.equal((await state()).invalid, 0);
  const canvas = page.getByRole('img', { name: '由五条立体粒子星臂组成的 Hohoo' });
  await page.waitForTimeout(4200);
  report.performance.desktop = await snapshot();
  report.performance.gpu = await canvas.evaluate(c => {
    const gl = c.getContext('webgl2'); const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unavailable';
  });
  assert.equal(report.performance.desktop.attributeVersion, 0);
  assert.ok(report.performance.desktop.dpr <= 2);
  await page.screenshot({ path: path.join(output, 'desktop.png') });
  report.checks.push('GPU scene, immutable buffers, finite zero-initialized FBO');

  const box = await canvas.boundingBox();
  for (let i = 0; i < 18; i++) {
    await page.mouse.move(box.x + box.width * (0.40 + i * 0.004), box.y + box.height * 0.51);
    await page.waitForTimeout(15);
  }
  const pushed = await state();
  assert.ok(pushed.offsetEnergy > 0.000001, 'hover must displace GPU state');
  await page.screenshot({ path: path.join(output, 'repulsion.png') });
  await page.mouse.move(0, 0); await page.waitForTimeout(4500);
  const settled = await state();
  assert.ok(settled.offsetEnergy < pushed.offsetEnergy * 0.03, 'spring must settle');
  assert.equal(settled.invalid, 0);
  report.checks.push('GPU hover repulsion and spring recovery');

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.5 + 130, box.y + box.height * 0.5 + 30, { steps: 15 }); await page.mouse.up();
  const release = await snapshot(); await page.waitForTimeout(200); const inertia = await snapshot();
  assert.ok(Math.abs(inertia.yaw - release.yaw) > 0.002, 'rotation must continue after release');
  await page.waitForTimeout(1400); assert.ok(Math.abs((await snapshot()).velocityX) < Math.abs(release.velocityX), 'inertia must decay');
  await page.screenshot({ path: path.join(output, 'rotation.png') });
  await page.getByRole('button', { name: '复位', exact: true }).click();
  assert.ok(Math.abs((await snapshot()).yaw + 0.035) < 0.0001);
  await canvas.press('ArrowRight'); assert.ok((await snapshot()).yaw > 0.1);
  await canvas.press('r');
  await canvas.press('Space'); await page.waitForTimeout(200); assert.ok((await state()).offsetEnergy > 0.00001);
  await page.getByRole('button', { name: '复位', exact: true }).click();
  report.checks.push('Drag rotation, damped inertia, keyboard, scatter and reset');

  await page.getByRole('button', { name: '暂停', exact: true }).click(); await page.waitForTimeout(200);
  const stopped = await snapshot(); await page.waitForTimeout(300); assert.equal((await snapshot()).renderCount, stopped.renderCount);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForFunction(() => window.__astra);
  assert.equal((await snapshot()).paused, true, 'pause persists across reload');
  await page.getByRole('button', { name: '播放', exact: true }).click();
  report.checks.push('Pause stops render loop and persists');

  await page.evaluate(() => window.scrollTo({ top: 440, behavior: 'instant' })); await page.waitForTimeout(1300);
  const scroll = await snapshot();
  assert.ok(scroll.scatter > 0.01 && scroll.shape < 1 && scroll.rotation > 0.01);
  assert.equal(scroll.attributeVersion, 0);
  assert.ok(Math.abs(scroll.yaw + 0.035) < 0.0001, 'scroll must not mutate drag pose');
  await page.screenshot({ path: path.join(output, 'scroll.png') });
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })); await page.waitForTimeout(300);
  assert.equal((await snapshot()).visible, false);
  const offscreen = (await snapshot()).renderCount; await page.waitForTimeout(300); assert.equal((await snapshot()).renderCount, offscreen);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(500);
  report.checks.push('Uniform-only scroll morph and offscreen render suspension');

  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  // Headless browsers may keep both documents visible; only assert when Page Visibility changes.
  if (await page.evaluate(() => document.hidden)) {
    await page.waitForTimeout(150); const hiddenFrames = (await snapshot()).renderCount;
    await page.waitForTimeout(250); assert.equal((await snapshot()).renderCount, hiddenFrames);
    report.checks.push('Background document suspension');
  } else report.limitations.push('Headless backend did not expose tab visibility transitions.');
  await other.close(); await page.bringToFront();

  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(250);
  const reduced = await snapshot(); assert.equal(reduced.reduced, true); assert.equal(reduced.scatter, 0);
  await page.waitForTimeout(250); assert.equal((await snapshot()).renderCount, reduced.renderCount);
  assert.equal(await page.getByRole('button', { name: '拨散', exact: true }).isEnabled(), false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  report.checks.push('Reduced motion disables continuous rendering and scroll motion');

  for (const width of [1440, 1280, 1024, 768, 430, 375]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
  }
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage(); await mobile.goto(base + '/?debug=1', { waitUntil: 'networkidle' });
  await mobile.waitForFunction(() => window.__astra?.snapshot().renderCount > 60);
  report.performance.mobileEmulation = await mobile.evaluate(() => window.__astra.snapshot());
  assert.ok(report.performance.mobileEmulation.count <= 8192 && report.performance.mobileEmulation.dpr <= 1.5);
  assert.ok(report.performance.mobileEmulation.bloomScale < report.performance.desktop.bloomScale);
  await mobile.screenshot({ path: path.join(output, 'mobile.png') });
  const session = await mobileContext.newCDPSession(mobile);
  const cbox = await mobile.locator('canvas').boundingBox();
  const tx = Math.round(cbox.x + cbox.width / 2), ty = Math.round(cbox.y + cbox.height / 2);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let dx = 10; dx <= 60; dx += 10) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + dx, y: ty }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(Math.abs((await mobile.evaluate(() => window.__astra.snapshot())).yaw + 0.035) > 0.1);
  report.checks.push('Six responsive widths, mobile particle/DPR/Bloom downgrade, touch rotation');

  await mobileContext.close();
  const dprContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const high = await dprContext.newPage(); await high.goto(base + '/?debug=1', { waitUntil: 'networkidle' });
  await high.waitForFunction(() => window.__astra?.snapshot().renderCount > 180);
  report.performance.desktopDpr2 = await high.evaluate(() => window.__astra.snapshot());
  report.checks.push('Desktop DPR 2 performance sample');
  await dprContext.close();
  await page.getByRole('button', { name: '播放', exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.__astra.loseContext());
  await page.getByText('交互视觉暂不可用，正文仍可阅读。', { exact: false }).waitFor();
  await page.evaluate(() => window.__astra.restoreContext()); await page.waitForTimeout(400);
  await page.getByRole('button', { name: '重新加载视觉' }).click();
  await page.waitForFunction(() => window.__astra?.snapshot().renderCount > 10);
  assert.equal((await state()).invalid, 0);
  report.checks.push('Context loss fallback and explicit resource recreation');

  const nojs = await browser.newContext({ javaScriptEnabled: false }); const staticPage = await nojs.newPage();
  await staticPage.goto(base); assert.ok(await staticPage.getByText('Hohoo', { exact: true }).isVisible());
  assert.ok(await staticPage.getByRole('heading', { name: '探索智能，构建可能。' }).isVisible());
  report.checks.push('No-JS static brand and readable body');
  assert.deepEqual(errors, []);
  report.checks.push('No JS errors, failed resources or shader compile errors');
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
