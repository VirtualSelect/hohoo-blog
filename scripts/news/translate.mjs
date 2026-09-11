import fs from 'node:fs/promises';
import {summarize} from './lib.mjs';

if(process.env.NEWS_SUMMARIZE !== 'true') throw new Error('Set NEWS_SUMMARIZE=true and configure the provider first');
const file = new URL('../../data/news/items.json', import.meta.url);
const items = JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const result = [];
// Stage all translations in memory: failures leave published data untouched.
for(const item of items) result.push(item.translations ? item : await summarize(item));
await fs.writeFile(file, JSON.stringify(result,null,2)+'\n');
console.log('Translated missing bilingual entries. Run news:render and news:check before review.');
