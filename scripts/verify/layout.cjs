// Run against a dedicated local test browser: node scripts/verify/layout.cjs <CDP websocket URL>
const fs = require('node:fs');
const path = require('node:path');
const endpoint = process.argv[2];
if (!endpoint) throw Error('Provide a CDP websocket URL');
const base = process.env.VERIFY_BASE_URL || 'http://localhost:4173';
(async () => {
  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let sequence = 0,
    sessionId;
  const pending = new Map(),
    errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? task.reject(Error(JSON.stringify(message.error)))
        : task.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown')
      errors.push(
        message.params.exceptionDetails.text +
          ': ' +
          (message.params.exceptionDetails.exception?.description || ''),
      );
  };
  const send = (method, params = {}, attached = true) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      ws.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(attached && sessionId ? { sessionId } : {}),
        }),
      );
    });
  const { targetId } = await send(
    'Target.createTarget',
    { url: 'about:blank' },
    false,
  );
  sessionId = (
    await send('Target.attachToTarget', { targetId, flatten: true }, false)
  ).sessionId;
  await send('Page.enable');
  await send('Runtime.enable');
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
    return r.result.value;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const go = async (route) => {
    await send('Page.navigate', { url: base + route });
    for (let i = 0; i < 80; i++) {
      await sleep(80);
      if (await evaluate('document.readyState === "complete" && document.documentElement.dataset.hasHydrated === "true"')) break;
    }
    await sleep(120);
  };
  const output = path.resolve('.cache-loader/verification');
  fs.mkdirSync(output, { recursive: true });
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    fs.writeFileSync(
      path.join(output, name + '.png'),
      Buffer.from(r.data, 'base64'),
    );
  };
  const routes = [
    '/',
    '/learning',
    '/timeline',
    '/research',
    '/docs/ai-apps',
    '/docs/llm',
    '/docs/embodied-ai',
    '/docs/skill',
    '/now',
    '/about',
    '/blog',
    '/blog/tags',
    '/blog/archive',
    '/blog/a-new-milestone',
    '/projects',
    '/projects/hohoo-blog',
    '/labs',
    '/labs/retrieval-eval',
    '/radar',
    '/radar/weekly/2026-W37',
    '/notes',
    '/papers',
    '/reading',
    '/radar/weekly',
    '/labs/tool-eval',
    '/labs/action-representation',
    '/changelog',
    '/404.html',
    '/en/',
    '/en/reading',
    '/en/papers',
    '/en/projects/hohoo-blog',
    '/en/labs/retrieval-eval',
    '/en/radar/weekly',
  ];
  const results = [];
  for (const theme of ['light', 'dark']) {
    const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', {
      source:
        'try{localStorage.setItem("theme",' +
        JSON.stringify(theme) +
        ')}catch{}',
    });
    for (const width of [1440, 1280, 1024, 768, 430, 375]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      for (const route of routes) {
        await go(route);
        const value = await evaluate(
          '({width:innerWidth,scroll:document.documentElement.scrollWidth,theme:document.documentElement.dataset.theme,h1:document.querySelectorAll("h1").length,title:document.title})',
        );
        results.push({
          route,
          width,
          theme,
          ...value,
          overflow: value.scroll > width + 1,
        });
      }
      console.log(theme + ' ' + width + ': ' + routes.length + ' pages');
      if (width === 1440 || width === 375) {
        await go('/');
        await shot('home-' + theme + '-' + width);
        await go('/radar');
        await shot('radar-' + theme + '-' + width);
      }
    }
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await go('/radar');
  const before = await evaluate(
    'document.querySelector("main").getBoundingClientRect().width',
  );
  await evaluate(
    '(()=>{const i=document.querySelector("input[type=search]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"zzzz-no-matching-entry");i.dispatchEvent(new Event("input",{bubbles:true}));})()',
  );
  await sleep(250);
  const after = await evaluate(
    '({width:document.querySelector("main").getBoundingClientRect().width,empty:document.body.innerText.includes("当前没有匹配的资讯"),overflow:document.documentElement.scrollWidth>innerWidth})',
  );
  await shot('radar-empty-375');
  const redirects = [];
  for (const route of [
    '/aboutMe',
    '/en/aboutMe',
    '/news',
    '/en/news',
    '/news/weekly',
    '/en/news/weekly',
    '/lab',
    '/en/lab',
    '/lab#retrieval-eval',
    '/blog/a%20new%20milestone',
    '/en/blog/a%20new%20milestone',
  ]) {
    await go(route);
    redirects.push({ from: route, to: await evaluate('location.pathname') });
  }
  const report = {
    results,
    errors: [...new Set(errors)],
    emptySearch: { before, ...after },
    redirects,
  };
  fs.writeFileSync(
    path.join(output, 'layout.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      checks: results.length,
      overflows: results.filter((r) => r.overflow),
      errors: report.errors,
      emptySearch: report.emptySearch,
      redirects,
    }),
  );
  await send('Target.closeTarget', { targetId }, false);
  ws.close();
  if (
    results.some((r) => r.overflow) ||
    report.errors.length ||
    after.width !== before ||
    !after.empty
  )
    process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
