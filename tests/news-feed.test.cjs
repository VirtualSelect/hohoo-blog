const {test}=require('node:test');
const assert=require('node:assert/strict');
const {renderFeed}=require('../plugins/news-feed.cjs');
const Parser=require('rss-parser');
test('RSS escapes source text, preserves stable IDs and uses locale links',async()=>{
 const item={id:'a',title:'A & <B>',summary:'<script>text</script>',sourceName:'Source',url:'https://example.com/?a=1&b=2',category:'llm',publishedAt:'2026-09-11T00:00:00Z',translations:{zh:{title:'中文标题',summary:'摘要'}}};
 const xml=renderFeed([item],'https://huhohoo.com/','en');
 assert.ok(!xml.includes('<script>'));assert.ok(xml.includes('/en/news/rss.xml'));
 const feed=await new Parser().parseString(xml);assert.equal(feed.items[0].title,item.title);assert.equal(feed.items[0].guid,'hohoo-news:a');
 const zh=await new Parser().parseString(renderFeed([item],'https://huhohoo.com','zh-CN'));assert.equal(zh.items[0].title,'中文标题');
});
test('RSS retains only 100 newest entries, including valid empty feeds',async()=>{
 const items=Array.from({length:101},(_,i)=>({id:String(i),title:'Item',summary:'',sourceName:'Source',url:'https://example.com/'+i,category:'llm',publishedAt:new Date(1700000000000+i*1000).toISOString()}));
 const feed=await new Parser().parseString(renderFeed(items,'https://huhohoo.com','en'));assert.equal(feed.items.length,100);assert.equal(feed.items[0].guid,'hohoo-news:100');
 assert.equal((await new Parser().parseString(renderFeed([],'https://huhohoo.com','en'))).items.length,0);
});
