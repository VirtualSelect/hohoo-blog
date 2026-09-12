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
  const checks=[];const check=(name,passed)=>{checks.push({name,passed});if(!passed)console.log('FAILED '+name)};
  const key=async(code,keyCode,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:code,code:code==='k'?'KeyK':code,windowsVirtualKeyCode:keyCode,modifiers});await send('Input.dispatchKeyEvent',{type:'keyUp',key:code,windowsVirtualKeyCode:keyCode,modifiers});};
  for(const theme of ['light','dark'])for(const width of [1440,375]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await go('/');await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await key('k',75,2);for(let i=0;i<60;i++){if(await evaluate('!!document.querySelector("dialog[open]")'))break;await sleep(100);}
    check(`${theme}/${width} shortcut and autofocus`,await evaluate('document.querySelector("dialog")?.open && document.activeElement.id==="site-search"'));
    await evaluate('(()=>{const i=document.querySelector("#site-search");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"type:paper RAG");i.dispatchEvent(new Event("input",{bubbles:true}));})()');await sleep(150);
    check(`${theme}/${width} typed search`,await evaluate('document.querySelectorAll(".hh-search-results li").length===1 && document.querySelector(".hh-search-results").textContent.includes("Retrieval-Augmented")'));
    await shot(`phase2-search-${theme}-${width}`);
    await evaluate('(()=>{const i=document.querySelector("#site-search");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(i,"zzzz-no-content");i.dispatchEvent(new Event("input",{bubbles:true}));})()');await sleep(100);
    check(`${theme}/${width} empty bounds`,await evaluate('document.querySelector("dialog").textContent.includes("没有匹配内容") && document.querySelector("dialog").getBoundingClientRect().right<=innerWidth && document.documentElement.scrollWidth<=innerWidth'));
    for(let i=0;i<8;i++)await key('Tab',9);
    check(`${theme}/${width} focus trap`,await evaluate('document.querySelector("dialog").contains(document.activeElement)'));
    await key('Escape',27);await sleep(250);check(`${theme}/${width} Escape and focus return`,await evaluate('!document.querySelector("dialog")&&document.activeElement.classList.contains("hh-search-trigger")'));
  }
  await go('/reading');await evaluate('localStorage.removeItem("huhohoo.reading.v2");localStorage.setItem("hohoo-news-reading-v1",JSON.stringify({saved:["paper:2005.11401"],read:[]}));');await go('/reading');
  check('Legacy inbox migration',await evaluate('JSON.parse(localStorage.getItem("huhohoo.reading.v2")).saved.includes("paper:2005.11401") && document.querySelector("main").textContent.includes("Retrieval-Augmented")'));
  await evaluate('Array.from(document.querySelectorAll("main button")).find(b=>b.textContent.includes("开始阅读")).click()');await sleep(150);
  await evaluate('(()=>{const i=document.querySelector("main select");i.value="reading";i.dispatchEvent(new Event("change",{bubbles:true}));})()');await sleep(150);
  check('Reading status filter',await evaluate('document.querySelector("main").textContent.includes("Retrieval-Augmented")'));
  await evaluate('Array.from(document.querySelectorAll("main button")).find(b=>b.textContent.includes("标记已读")).click()');await sleep(150);await go('/en/reading');
  await evaluate('(()=>{const i=document.querySelector("main select");i.value="done";i.dispatchEvent(new Event("change",{bubbles:true}));})()');await sleep(150);
  check('Completed status persists across locales',await evaluate('document.querySelector("main").textContent.includes("Retrieval-Augmented")'));
  for(const route of ['/projects/hohoo-blog','/labs/retrieval-eval','/radar/weekly/2026-W37','/papers','/reading','/404.html']){await go(route);await shot('phase2-'+route.replaceAll('/','-'));}
  await go('/404.html');await evaluate('document.querySelector("main button").click()');await sleep(350);check('404 search opens',await evaluate('!!document.querySelector("dialog[open]")'));await key('Escape',27);
  await go('/projects/hohoo-blog');check('Project has real structured data',await evaluate('Array.from(document.querySelectorAll("script")).some(s=>s.type==="application/ld+json" && s.textContent.includes("SoftwareSourceCode"))'));
  await go('/');check('Homepage exact title',await evaluate(`document.title === "Hohoo's AI Lab · AI Engineering, LLM & Embodied AI"`));
  const {identifier}=await send('Page.addScriptToEvaluateOnNewDocument',{source:'Object.defineProperty(window,"localStorage",{get(){throw new Error("blocked storage")}})'});await go('/reading');check('Blocked storage does not crash',await evaluate('document.querySelector("main").textContent.includes("存储不可用")'));await send('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  fs.writeFileSync(path.join(output,'phase2-interactions.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));await send('Target.closeTarget',{targetId},false);ws.close();if(checks.some(c=>!c.passed)||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
