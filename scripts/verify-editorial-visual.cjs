const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const out = path.join(require('node:os').tmpdir(), 'hohoo-editorial');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const route of ['/', '/learning', '/projects', '/radar', '/blog', '/docs/llm', '/en/']) {
      const response = await page.goto('http://localhost:4173' + route, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, route);
      for (const theme of ['dark', 'light']) {
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
        for (const width of [1440, 1280, 1024, 768, 430, 375]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} ${theme} ${width}`);
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        if (['/', '/learning', '/docs/llm'].includes(route)) await page.screenshot({ path: path.join(out, `${route.replaceAll('/', '-') || 'home'}-${theme}.png`) });
      }
      assert.equal(await page.locator('.hh-particle-background').count(), 0);
      assert.equal(await page.locator('.hh-motion-toggle').count(), ['/', '/en/'].includes(route) ? 1 : 0);
    }
    await page.goto('http://localhost:4173');
    await page.setViewportSize({ width: 375, height: 900 });
    await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
    const toggle = page.locator('.navbar__toggle');
    await toggle.click();
    await page.locator('.navbar-sidebar').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('.navbar__toggle').getAttribute('aria-expanded') === 'false');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: '7 routes × 2 themes × 6 widths, no background canvas, mobile navigation, no JS errors', screenshots: out }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
