import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessRelevance} from '../scripts/news/relevance.mjs';
import {localizedNews} from '../src/utils/news-locale.mjs';
import {canonicalUrl, classify, dailyMarkdown, fetchText, parseFeed, selectItems, summarize} from '../scripts/news/lib.mjs';
const now = new Date('2026-09-11T08:00:00Z');
const source = {id:'test',name:'Test',hosts:['example.com'],defaultCategory:'ai-apps'};
const item = (id='a', extra={}) => ({id,title:'Title '+id,url:'https://example.com/'+id,sourceId:'test',sourceName:'Test',category:'ai-apps',publishedAt:'2026-09-10T00:00:00.000Z',collectedAt:now.toISOString(),summary:'Feed excerpt',summaryKind:'source-excerpt',...extra});
const config = {dailyLimit:5,perSourceLimit:2,blockedUrls:[]};

test('canonical URLs remove tracking and reject unsafe or unrelated destinations',()=>{
 assert.equal(canonicalUrl('https://example.com/a/?utm_source=x#part',source.hosts),'https://example.com/a');
 for(const url of ['javascript:alert(1)','http://example.com/a','https://evil.test/a','https://user:pass@example.com/a','https://example.com:8080/a']) assert.throws(()=>canonicalUrl(url,source.hosts));
});
test('RSS parsing uses source dates and skips invalid, future, stale and off-domain entries',async()=>{
 const xml=`<rss version="2.0"><channel><title>Test</title>
 <item><title>Robotics &amp; AI</title><link>https://example.com/robot</link><pubDate>Thu, 10 Sep 2026 00:00:00 GMT</pubDate><description><![CDATA[<p>Robot learning.</p><script>bad()</script>]]></description></item>
 <item><title>Future</title><link>https://example.com/future</link><pubDate>Fri, 10 Sep 2027 00:00:00 GMT</pubDate></item>
 <item><title>Missing date</title><link>https://example.com/missing</link></item>
 <item><title>Old</title><link>https://example.com/old</link><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item>
 <item><title>Wrong domain</title><link>https://evil.test/a</link><pubDate>Thu, 10 Sep 2026 00:00:00 GMT</pubDate></item>
 </channel></rss>`;
 const result=await parseFeed(xml,source,now);
 assert.equal(result.items.length,1); assert.equal(result.skipped,4);
 assert.equal(result.items[0].title,'Robotics & AI'); assert.equal(result.items[0].category,'embodied-ai');
 assert.equal(result.items[0].publishedAt,'2026-09-10T00:00:00.000Z');
 await assert.rejects(parseFeed('<!DOCTYPE rss><rss/>',source,now));
});
test('Atom feeds and short excerpts are supported',async()=>{
 const xml=`<feed xmlns="http://www.w3.org/2005/Atom"><title>Test</title><entry><title>LLM</title><link href="https://example.com/llm"/><id>test</id><updated>2026-09-10T00:00:00Z</updated><summary>${'word '.repeat(100)}</summary></entry></feed>`;
 const result=await parseFeed(xml,source,now);assert.equal(result.items.length,1);assert.ok(result.items[0].summary.length<=180);
});
test('selection enforces per-source limits, daily rerun limits and rejected URLs',()=>{
 const candidates=Array.from({length:8},(_,i)=>item(String(i),{sourceId:'s'+(i%3)}));
 const chosen=selectItems(candidates,[],config,now);assert.equal(chosen.length,5);
 assert.equal(selectItems(candidates,chosen,config,now).length,0);
 assert.equal(selectItems([item('a')],[],{...config,blockedUrls:['https://example.com/a']},now).length,0);
 assert.equal(selectItems([item('a'),item('b'),item('c')],[],config,now).length,2);
});

test('primary source wins within limits, with fallback and rerun caps',()=>{
 const primary={id:'aihot',priority:100,dailyLimit:4};
 const cfg={...config,sources:[primary]};
 const main=Array.from({length:5},(_,i)=>item('p'+i,{sourceId:'aihot',publishedAt:'2026-09-09T00:00:00.000Z'}));
 const secondary=[item('s1'),item('s2')];
 const selected=selectItems([...secondary,...main],[],cfg,now);
 assert.equal(selected.length,5);assert.equal(selected.filter(i=>i.sourceId==='aihot').length,4);
 assert.equal(selected[0].sourceId,'aihot');
 assert.equal(selectItems(main,selected,cfg,now).length,0);
 assert.equal(selectItems(secondary,[],cfg,now).length,2);
});

test('ten daily slots and six AIHOT slots are shared by repeat runs',()=>{
 const cfg={dailyLimit:10,perSourceLimit:2,sources:[{id:'aihot',priority:100,dailyLimit:6}]};
 const candidates=Array.from({length:18},(_,i)=>item('cap'+i,{sourceId:i<8?'aihot':i<13?'other-a':'other-b'}));
 const first=selectItems(candidates,[],cfg,now);
 assert.equal(first.length,10);assert.equal(first.filter(i=>i.sourceId==='aihot').length,6);
 assert.equal(selectItems(candidates,first,cfg,now).length,0);
 const nextDay=new Date('2026-09-12T08:00:00Z');
 assert.ok(selectItems([item('fresh',{sourceId:'aihot',collectedAt:nextDay.toISOString()})],first,cfg,nextDay).length===1);
});
test('research fit outranks source priority and recency within daily caps',()=>{
 const cfg={dailyLimit:1,perSourceLimit:2,sources:[{id:'aihot',priority:100,dailyLimit:1}]};
 const broad=item('new',{sourceId:'aihot',title:'LLM training update',summary:''});
 const focus=item('focus',{title:'RAG retrieval evaluation benchmark',summary:'',publishedAt:'2026-09-09T00:00:00.000Z'});
 assert.equal(selectItems([broad,focus],[],cfg,now)[0].id,'focus');
});
test('AIHOT feed retains aggregator links without navigation text in excerpts',async()=>{
 const xml='<rss version="2.0"><channel><title>AIHOT</title><item><title>Agent 评测</title><link>https://aihot.news/items/one</link><pubDate>Thu, 10 Sep 2026 00:00:00 GMT</pubDate><description><![CDATA[<p>工具调用评测。</p><p>🔗 <a href="https://example.com">阅读原文</a></p><p>via AIHOT · link</p>]]></description></item></channel></rss>';
 const result=await parseFeed(xml,{id:'aihot',name:'AIHOT',hosts:['aihot.news'],aggregator:true},now);
 assert.equal(result.items[0].url,'https://aihot.news/items/one');
 assert.equal(result.items[0].summary,'工具调用评测。');
});
test('deduplication preserves distinct Chinese titles and rejects same title or URL',()=>{
 const chosen=selectItems([item('a',{title:'机器人学习'}),item('b',{title:'模型推理'}),item('c',{title:'机器人学习',sourceId:'other'})],[],{...config,perSourceLimit:5},now);
 assert.equal(chosen.length,2);
 assert.equal(selectItems([item('a')],[item('a',{collectedAt:'2026-09-01T00:00:00.000Z'})],config,now).length,0);
});
test('feed failures retry and size limits are enforced',async()=>{
 let calls=0;
 const fetchImpl=async()=>{calls++;return new Response(calls===1?'error':'<rss/>',{status:calls===1?503:200});};
 assert.equal(await fetchText('https://example.com/feed',{fetchImpl,attempts:2}),'<rss/>');assert.equal(calls,2);
 await assert.rejects(fetchText('https://example.com/feed',{fetchImpl:async()=>new Response('12345'),maxBytes:3,attempts:1}),/size limit/);
});
test('summaries are optional, bounded, and invalid responses fail for caller fallback',async()=>{
 assert.deepEqual(await summarize(item(),{}),item());
 const env={NEWS_SUMMARIZE:'true',NEWS_LLM_URL:'https://api.example.com/chat/completions',NEWS_LLM_API_KEY:'test-only',NEWS_LLM_MODEL:'test'};
 const response=value=>async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));
 const result=await summarize(item(),env,response({zh:{title:'中文标题',summary:'中文摘要'},en:{title:'English title',summary:'English summary'}}));assert.equal(result.summaryKind,'ai-summary');
 assert.equal(result.originalSummary,'Feed excerpt');
 assert.equal(localizedNews(result,'en').summary,'English summary');
 assert.equal(localizedNews(result,'zh-CN').summary,'中文摘要');
 await assert.rejects(summarize(item(),env,response({titleZh:'测试',summary:'x'.repeat(181)})));
 await assert.rejects(summarize(item(),{...env,NEWS_LLM_URL:'http://localhost'},response({})));
});
test('daily pages escape untrusted Markdown/MDX and retain original attribution',()=>{
 const markdown=dailyMarkdown('2026-09-11',[item('a',{title:'<script>{bad}</script> [link]',summary:'**not executable**'})]);
 assert.ok(!markdown.includes('<script>'));assert.ok(!markdown.includes('{bad}'));
 assert.ok(markdown.includes('NewsDigest'));assert.ok(markdown.includes('2026-09-11'));
 assert.throws(()=>dailyMarkdown('bad" date',[]));
});

test('editorial filter requires topic relevance and technical substance, not a famous source',()=>{
 assert.equal(assessRelevance(item('a',{title:'How AI-native companies turn workflows into operating capability',summary:'Agents transform company workflows.'})).accepted,false);
 assert.equal(assessRelevance(item('a',{title:'Rebuilding AUTOMATIC1111 with Gradio Workflow',summary:''})).accepted,true);
 for(const title of ['AlphaGenome Atlas genome map','New partnership for LLM training','Now everyone can put data to work','Weather model benchmark','Introducing a new language model']) assert.equal(assessRelevance(item('a',{title,summary:''})).accepted,false,title);
 for(const [title,category] of [['RAG retrieval evaluation benchmark','ai-apps'],['LLM quantization inference benchmark','llm'],['Robot policy simulation dataset','embodied-ai']]) {
  const result=assessRelevance(item('a',{title,summary:''}));assert.equal(result.accepted,true,title);assert.equal(result.category,category);
 }
 assert.equal(localizedNews(item(),'zh-CN').fallback,true);
});
test('engineering methods are accepted without admitting generic announcements',()=>{
 for (const [title,summary] of [
  ['Agent 长任务上下文工程解析','上下文预算与卸载、压缩、todo-state 复述和跨会话记忆。'],
  ['LlamaIndex 解析 just-in-time Agentic OCR','先用解析器粗读全部文件供检索，再仅对相关页面调用 VLM 做 OCR。'],
 ]) {
  const result=assessRelevance(item('a',{title,summary}));
  assert.equal(result.accepted,true,title);assert.equal(result.category,'ai-apps');
 }
 for (const [title,summary] of [
  ['Agent 上下文工程新品发布','欢迎试用我们的产品'],
  ['Agent OCR 工具上线','提高文档处理效率'],
  ['Agent 上下文工程融资','预算与压缩机制'],
  ['办公预算压缩','节省成本'],
 ]) assert.equal(assessRelevance(item('a',{title,summary})).accepted,false,title);
});
test('classification prioritizes embodied topics, then application use cases',()=>{
 assert.equal(classify('Robot agent','llm'),'embodied-ai');assert.equal(classify('Codex in production','llm'),'ai-apps');assert.equal(classify('New language model','ai-apps'),'llm');
});
