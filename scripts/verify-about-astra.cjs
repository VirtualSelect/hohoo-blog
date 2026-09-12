const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(require('node:os').tmpdir(), 'hohoo-about-astra');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /THREE|shader|WebGL/.test(m.text())) errors.push(m.text()); });
    await page.goto('http://localhost:4173/about?debug=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__astra?.snapshot().renderCount > 30);
    const snap = () => page.evaluate(() => window.__astra.snapshot());
    assert.equal((await snap()).simulation, true);
    assert.equal(await page.evaluate(() => window.__astra.sampleSimulation().invalid), 0);
    assert.equal(await page.locator('h1').count(), 1);
    const canvas = page.locator('canvas[aria-describedby="about-astra-help"]');
    const start = await snap();
    await canvas.press('ArrowRight');
    assert.notEqual((await snap()).yaw, start.yaw);
    await page.getByRole('button', { name: '复位', exact: true }).click();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .65, box.y + box.height * .6, { steps: 12 }); await page.mouse.up();
    assert.notEqual((await snap()).yaw, start.yaw);
    await page.getByRole('button', { name: '复位', exact: true }).click();
    await page.getByRole('button', { name: '拨散', exact: true }).click();
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(() => window.__astra.sampleSimulation().offsetEnergy > 0));
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    const paused = (await snap()).renderCount; await page.waitForTimeout(200);
    assert.equal((await snap()).renderCount, paused);
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await page.getByRole('button', { name: '复位', exact: true }).click();
    await page.waitForTimeout(3500);
    const performance = await snap();
    await page.screenshot({ path: path.join(out, 'hero.png') });
    await page.evaluate(() => scrollTo(0, 350)); await page.waitForTimeout(400);
    assert.ok((await snap()).scatter > 0);
    assert.ok(Number(await canvas.evaluate(el => el.style.opacity)) < 1);
    await page.getByRole('link', { name: '了解我 ↓' }).click(); await page.waitForTimeout(400);
    assert.ok(await page.locator('#about-content').isVisible());
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await page.screenshot({ path: path.join(out, `content-${theme}.png`) });
      for (const width of [1440, 1280, 1024, 768, 430, 375]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
    await page.locator('footer').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const hidden = (await snap()).renderCount; await page.waitForTimeout(200);
    assert.equal((await snap()).renderCount, hidden);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.navbar__brand').first().click();
    await page.waitForFunction(() => !window.__astra);
    await page.goto('http://localhost:4173/en/about?debug=1');
    await page.waitForFunction(() => window.__astra?.snapshot().renderCount > 5);
    assert.ok(await page.getByRole('button', { name: 'Scatter', exact: true }).isEnabled());
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(200);
    const reduced = (await snap()).renderCount; await page.waitForTimeout(200);
    assert.equal((await snap()).renderCount, reduced);
    await page.close();
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const phone = await mobile.newPage(); await phone.goto('http://localhost:4173/about?debug=1');
    await phone.waitForFunction(() => window.__astra?.snapshot().renderCount > 5);
    const mobileStats = await phone.evaluate(() => window.__astra.snapshot());
    assert.ok(mobileStats.count <= 8192 && mobileStats.dpr <= 1.5);
    await phone.screenshot({ path: path.join(out, 'mobile.png') }); await mobile.close();
    const staticPage = await browser.newPage({ javaScriptEnabled: false });
    await staticPage.goto('http://localhost:4173/about');
    assert.ok(await staticPage.getByText('你好，我是 Hohoo。', { exact: true }).isVisible());
    await staticPage.close(); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: 'GPU, scatter, rotation, pause, scroll fade, 6 widths, 2 themes, offscreen, route cleanup, English, reduced motion, mobile downgrade, SSR', performance, mobileStats, screenshots: out }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
