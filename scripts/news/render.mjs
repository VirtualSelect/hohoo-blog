import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalUrl, categories, dailyMarkdown} from './lib.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=async file=>JSON.parse((await fs.readFile(path.join(root,file),'utf8')).replace(/^\uFEFF/,''));
const preview=process.argv.includes('--preview');
const contentRoot=preview ? path.join(root,'.cache-loader/news-preview') : root;
let items=JSON.parse((await fs.readFile(path.join(contentRoot,'data/news/items.json'),'utf8')).replace(/^\uFEFF/,''));
const config=await read('config/news-sources.json');
const reject=process.argv.indexOf('--reject');
if(reject>=0){
  if(preview || process.argv.includes('--check')) throw new Error('Reject cannot be combined with preview/check');
  const id=process.argv[reject+1];const item=items.find(item=>item.id===id);
  if(!item) throw new Error('Unknown news ID');
  config.blockedUrls=[...new Set([...config.blockedUrls,item.url])];
  items=items.filter(item=>item.id!==id);
  await fs.writeFile(path.join(root,'config/news-sources.json'),JSON.stringify(config,null,2)+'\n');
  await fs.writeFile(path.join(root,'data/news/items.json'),JSON.stringify(items,null,2)+'\n');
}
const seen=new Set();
for(const item of items){
  const source=config.sources.find(source=>source.id===item.sourceId);
  if(!source || item.sourceName!==source.name || canonicalUrl(item.url,source.hosts)!==item.url || seen.has(item.url)) throw new Error('Invalid/duplicate source URL: '+item.id);
  seen.add(item.url);
  if(!/^[a-f0-9]{20}$/.test(item.id) || !categories.includes(item.category) || typeof item.title!=='string' || !item.title.trim() || item.title.length>240 || typeof item.summary!=='string' || item.summary.length>180 || !['ai-summary','source-excerpt','link-only'].includes(item.summaryKind)) throw new Error('Invalid news metadata: '+item.id);
  if(item.id!==createHash('sha256').update(item.url).digest('hex').slice(0,20)) throw new Error('ID does not match URL: '+item.id);
  if(item.titleZh!==undefined && (typeof item.titleZh!=='string' || item.titleZh.length>100)) throw new Error('Invalid translated title');
  if(item.translations !== undefined) {
    for(const language of ['zh','en']) {
      const value = item.translations[language];
      if(!value || typeof value.title !== 'string' || !value.title.trim() || value.title.length > (language==='zh'?100:240) || typeof value.summary !== 'string' || value.summary.length>180) throw new Error('Invalid bilingual content: '+item.id);
    }
  }
  for(const key of ['publishedAt','collectedAt']) if(!Number.isFinite(Date.parse(item[key])) || new Date(item[key]).toISOString()!==item[key]) throw new Error('Invalid timestamp: '+item.id);
}
const dir=path.join(contentRoot,'src/pages/news/daily');
const days=new Set(items.map(item=>item.collectedAt.slice(0,10)));
if(!process.argv.includes('--check')) await fs.mkdir(dir,{recursive:true});
for(const day of days){
  const file=path.join(dir,day+'.md');const markdown=dailyMarkdown(day,items.filter(item=>item.collectedAt.startsWith(day)));
  if(process.argv.includes('--check')){if(await fs.readFile(file,'utf8')!==markdown) throw new Error('Run npm run news:render to sync '+day);}
  else await fs.writeFile(file,markdown);
}
for(const name of await fs.readdir(dir).catch(()=>[])){
  if(/^\d{4}-\d{2}-\d{2}\.md$/.test(name) && !days.has(name.slice(0,10))){
    if(process.argv.includes('--check')) throw new Error('Orphan daily page: '+name);
    await fs.unlink(path.join(dir,name));
  }
}
console.log('News content validated: '+items.length+' items');
