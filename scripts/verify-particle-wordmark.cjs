// Optional browser regression check; use an existing Playwright installation.
// PLAYWRIGHT_MODULE can point to a bundled installation; no production dependency.
const assert = require('node:assert/strict');
const outputDir = process.env.WORDMARK_SCREENSHOT_DIR || require('node:os').tmpdir();
const baseUrl = process.env.WORDMARK_BASE_URL || 'http://localhost:4173';
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform === 'win32' ? {channel:'msedge'} : {})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{
  const proto=CanvasRenderingContext2D.prototype;
  const clear=proto.clearRect,arc=proto.arc;
  proto.clearRect=function(...a){this.canvas.__testPoints=[];this.canvas.__testFrames=(this.canvas.__testFrames||0)+1;return clear.apply(this,a)};
  proto.arc=function(x,y,...a){this.canvas.__testPoints?.push([x,y]);return arc.call(this,x,y,...a)};
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseUrl + '/',{waitUntil:'networkidle'});
 const canvas=page.locator('canvas[aria-describedby="wordmark-help"]');
 const help=page.locator('#wordmark-help');
 assert.equal(await help.evaluate(el=>getComputedStyle(el).clipPath),'inset(50%)','instructions must be visually hidden');
 assert.equal(await page.getByRole('button',{name:'向左旋转粒子',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'向右旋转粒子',exact:true}).count(),0);
 const positions=()=>canvas.evaluate(c=>c.__testPoints.slice(160));
 const rms=(a,b)=>Math.sqrt(a.reduce((n,p,i)=>n+(p[0]-b[i][0])**2+(p[1]-b[i][1])**2,0)/a.length);
 await page.getByRole('button',{name:'复位',exact:true}).click();
 const base=await positions();assert.ok(base.length>1000);
 const box=await canvas.boundingBox();const target=base[Math.floor(base.length/2)];
 await page.mouse.move(box.x+target[0],box.y+target[1]);await page.waitForTimeout(160);
 const hover=await positions();const displacement=rms(base,hover);assert.ok(displacement>0.1,'hover must displace points');
 await page.mouse.move(0,0);await page.waitForTimeout(3200);
 assert.ok(rms(base,await positions())<0.3,'particles must return after hovering');
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();await page.mouse.move(box.x+box.width/2+180,box.y+box.height/2+55,{steps:18});await page.mouse.up();
 assert.ok(rms(base,await positions())>20,'drag must rotate the point cloud');
 await page.screenshot({path:outputDir+'/hohoo-wordmark-rotated.png'});
 await page.getByRole('button',{name:'复位',exact:true}).click();assert.ok(rms(base,await positions())<0.01);
 await canvas.press('ArrowRight');assert.ok(rms(base,await positions())>1,'keyboard must rotate');
 await canvas.press('r');assert.ok(rms(base,await positions())<0.01);
 await canvas.press('Space');await page.waitForTimeout(170);assert.ok(rms(base,await positions())>3,'Space must scatter');
 await page.getByRole('button',{name:'复位',exact:true}).click();
 await page.getByRole('button',{name:'暂停粒子',exact:true}).click();await page.waitForTimeout(200);
 const frames=await canvas.evaluate(c=>c.__testFrames);await page.waitForTimeout(250);assert.equal(await canvas.evaluate(c=>c.__testFrames),frames,'paused must stop RAF rendering');
 assert.equal(await page.getByRole('button',{name:'拨散',exact:true}).isEnabled(),false);
 await page.getByRole('button',{name:'播放粒子',exact:true}).click();
 for(const width of [1440,1280,1024,768,430,375]) {await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width}`)}
 await page.screenshot({path:outputDir+'/hohoo-wordmark-mobile.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
 const reducedFrames=await canvas.evaluate(c=>c.__testFrames);await page.waitForTimeout(250);assert.equal(await canvas.evaluate(c=>c.__testFrames),reducedFrames);
 assert.equal(await page.getByRole('button',{name:'拨散',exact:true}).isEnabled(),false);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'切换浅色/暗黑模式（当前为暗黑模式）',exact:true}).click();
 await page.screenshot({path:outputDir+'/hohoo-wordmark-light.png'});
 await page.goto(baseUrl + '/en/',{waitUntil:'networkidle'});assert.equal(await page.getByRole('button',{name:'Reset',exact:true}).isEnabled(),true);
 assert.deepEqual(errors,[]);
 const nojs=await browser.newContext({javaScriptEnabled:false});const p=await nojs.newPage();await p.goto(baseUrl + '/');assert.equal(await p.getByText('Hohoo',{exact:true}).first().isVisible(),true);
 console.log(JSON.stringify({passed:['particle sampling','hover repulsion','spring return','drag rotation','reset','keyboard rotate/scatter','pause RAF','6 responsive sizes','reduced motion','light theme','English','SSR fallback','no page errors'],particles:base.length,hoverRms:displacement}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
