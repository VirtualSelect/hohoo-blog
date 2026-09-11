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
      if (await evaluate('document.readyState === "complete"')) break;
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

  const checks = [];
  const check = (name, passed) => {
    checks.push({ name, passed });
    if (!passed) console.log('FAILED ' + name);
  };
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await go('/');
  await evaluate('document.querySelector(".navbar__toggle").click()');
  await sleep(300);
  check(
    'Mobile menu opens',
    await evaluate(
      'document.body.classList.contains("navbar-sidebar--show")||document.querySelector(".navbar").classList.contains("navbar-sidebar--show")',
    ),
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
  });
  await sleep(300);
  check(
    'Escape closes mobile menu',
    await evaluate(
      '!document.body.classList.contains("navbar-sidebar--show")&&!document.querySelector(".navbar").classList.contains("navbar-sidebar--show")',
    ),
  );
  await go('/learning');
  await evaluate(
    'localStorage.removeItem("huhohoo.learning.v1");localStorage.setItem("hohoo-learning-v1",JSON.stringify({saved:["first-call"],completed:[]}))',
  );
  await go('/learning');
  check(
    'Legacy progress migrates',
    await evaluate(
      'JSON.parse(localStorage.getItem("huhohoo.learning.v1")).saved.includes("first-call")',
    ),
  );
  await evaluate(
    'document.querySelectorAll(".hh-step")[1].querySelector("button").click()',
  );
  await go('/learning');
  check(
    'Save persists after reload',
    await evaluate(
      'JSON.parse(localStorage.getItem("huhohoo.learning.v1")).saved.length===2',
    ),
  );
  await evaluate(
    '(()=>{const i=document.querySelector("#learning-search");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"zzzz-no-match");i.dispatchEvent(new Event("input",{bubbles:true}));})()',
  );
  await sleep(200);
  check(
    'Learning no-results handles empty random pool',
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("随机探索")).disabled',
    ),
  );
  await evaluate(
    'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.trim()==="清除筛选").click()',
  );
  await sleep(200);
  check(
    'Clear filters restores nodes',
    await evaluate('document.querySelectorAll(".hh-step").length>0'),
  );
  await go('/radar');
  await evaluate(
    'Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("稍后读")).click()',
  );
  await go('/radar');
  check(
    'Radar bookmark persists',
    await evaluate(
      'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.includes("已收藏"))',
    ),
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
  });
  check(
    'Keyboard focus is visible',
    await evaluate(
      'getComputedStyle(document.activeElement).outlineStyle!=="none"',
    ),
  );
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await go('/');
  check(
    'Reduced motion disables track transitions',
    await evaluate(
      'getComputedStyle(Array.from(document.querySelectorAll("a")).find(a=>a.pathname==="/docs/ai-apps"&&a.className.includes("note"))).transitionDuration==="0s"',
    ),
  );
  await go('/en/learning');
  check(
    'English learning labels',
    await evaluate(
      'document.body.innerText.includes("Choose your first topic")',
    ),
  );
  await go('/en/radar');
  check(
    'English radar labels',
    await evaluate(
      'Array.from(document.querySelectorAll("input")).some(i=>i.getAttribute("aria-label")==="Search news")',
    ),
  );
  fs.writeFileSync(
    path.join(output, 'interactions.json'),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }));
  await send('Target.closeTarget', { targetId }, false);
  ws.close();
  if (checks.some((c) => !c.passed) || errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
