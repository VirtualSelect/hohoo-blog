import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalUrl, dailyMarkdown, fetchText, parseFeed, selectItems, summarize} from './lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = async file => JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
const save = async (file, value) => {await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(file, value);};
const config = await readJson(path.join(root,'config/news-sources.json'));
const existing = await readJson(path.join(root,'data/news/items.json'));
for (const key of ['dailyLimit','perSourceLimit','lookbackDays']) if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 100) throw new Error('Invalid config: ' + key);
const sources = config.sources.filter(source => source.enabled);
if (!sources.length || sources.length > 10) throw new Error('Enable between 1 and 10 sources');
for (const source of sources) canonicalUrl(source.feed, source.hosts);
const now = new Date();
const report = {runAt:now.toISOString(), sources:[], summaryFailures:[], selected:[], mode:process.argv.includes('--write') ? 'pr-files' : 'preview'};
const candidates = [];
for (const source of sources) {
  try {
    const result = await parseFeed(await fetchText(source.feed), source, now, config.lookbackDays);
    candidates.push(...result.items);
    report.sources.push({source:source.name,status:'ok',eligible:result.items.length,skipped:result.skipped});
  } catch (error) {
    report.sources.push({source:source.name,status:'failed',error:error.message});
  }
}
let selected = selectItems(candidates, existing, config, now);
const summarized = [];
for (const item of selected) {
  try {summarized.push(await summarize(item));}
  catch {report.summaryFailures.push({id:item.id,source:item.sourceName,message:'Summary failed; retained source excerpt. Check provider settings.'}); summarized.push(item);}
}
selected = summarized;
report.selected = selected.map(({id,title,url,category,summaryKind}) => ({id,title,url,category,summaryKind}));
const outputRoot = process.argv.includes('--write') ? root : path.join(root,'.cache-loader/news-preview');
if (selected.length || !process.argv.includes('--write')) {
  const all = [...existing,...selected].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt));
  // The whole batch is calculated before any public content files are written.
  const days = new Set((process.argv.includes('--write') ? selected : all).map(item => item.collectedAt.slice(0,10)));
  for (const day of days) await save(path.join(outputRoot,'src/pages/news/daily',day + '.md'), dailyMarkdown(day, all.filter(item => item.collectedAt.startsWith(day))));
  await save(path.join(outputRoot,'data/news/items.json'), JSON.stringify(all,null,2) + '\n');
}
await save(path.join(root,'.cache-loader/news-report.json'), JSON.stringify(report,null,2) + '\n');
const successful = report.sources.filter(source => source.status === 'ok').length;
const body = `## AI 资讯审核\n\n新增 ${selected.length} 条资讯。采集成功 ${successful}/${sources.length} 个来源；摘要回退 ${report.summaryFailures.length} 条。\n\n- 检查原文日期、事实、分类与摘要，尤其是 AI 辅助摘要。\n- 如需剔除某条，运行 \`npm run news:reject -- <id>\`（将加入来源配置的排除列表）。\n- 若直接编辑 items.json，请运行 \`npm run news:render\` 同步日报。\n- 审核完成后将 PR 标记为 Ready，再手动合并；本流程不会自动合并。\n\n来源状态：\n${report.sources.map(source => '- ' + source.source + ': ' + source.status + (source.status === 'failed' ? '（请查看运行报告）' : '')).join('\n')}\n\n详细运行报告在 Actions 的 news-run-report artifact 中。\n`;
await save(path.join(root,'.cache-loader/news-pr.md'),body);
console.log(JSON.stringify(report,null,2));
if (!successful) process.exitCode = 1;
