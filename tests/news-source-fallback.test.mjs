import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fetchSource} from '../scripts/news/lib.mjs';
const source={id:'aihot',name:'AIHOT',feed:'https://aihot.news/feed/full.xml',fallbackFeeds:['https://aihot.news/feed.xml'],hosts:['aihot.news'],aggregator:true,defaultCategory:'llm'};
const now=new Date('2026-11-07T12:00:00Z');
const xml='<rss version="2.0"><channel><title>AIHOT</title><item><title>模型开源</title><link>https://aihot.news/items/example</link><pubDate>Sat, 07 Nov 2026 09:00:00 GMT</pubDate><description>模型训练代码与推理实现</description></item></channel></rss>';
test('the full feed wins without polling the duplicate brief feed',async()=>{
  const calls=[];const r=await fetchSource(source,now,14,async url=>{calls.push(url);return xml;});
  assert.deepEqual(calls,[source.feed]); assert.equal(r.items.length,1); assert.equal(r.fallback,false);
});
test('a broken full feed falls back sequentially to the same source identity',async()=>{
  const calls=[];const r=await fetchSource(source,now,14,async url=>{calls.push(url);if(url===source.feed)throw new Error('Feed HTTP 503');return xml;});
  assert.deepEqual(calls,[source.feed,...source.fallbackFeeds]);assert.equal(r.fallback,true);assert.equal(r.items[0].sourceId,'aihot');
});
test('access denial or rate limits never trigger endpoint switching, and hosts are validated first',async()=>{
  for(const status of [401,403,429]) {let calls=0;await assert.rejects(()=>fetchSource(source,now,14,async()=>{calls++;throw Object.assign(new Error('Denied'),{status});}));assert.equal(calls,1);}
  let calls=0;await assert.rejects(()=>fetchSource({...source,fallbackFeeds:['https://example.org/feed']},now,14,async()=>{calls++;return xml;}));assert.equal(calls,0);
});
test('collection is AIHOT only and retains the daily global cap',()=>{
  const c=JSON.parse(fs.readFileSync(new URL('../config/news-sources.json',import.meta.url)));
  assert.deepEqual(c.sources.filter(s=>s.enabled).map(s=>s.id),['aihot']);assert.equal(c.dailyLimit,10);assert.equal(c.sources[0].dailyLimit,'shared');
});
