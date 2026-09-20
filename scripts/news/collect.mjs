import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalUrl,
  dailyMarkdown,
  fetchText,
  parseFeed,
  publicNewsItem,
  selectItems,
  summarize,
} from './lib.mjs';
import { assessRelevance } from './relevance.mjs';
import radar from '../../src/utils/radar.cjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const readJson = async (file) =>
  JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
const save = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, value);
};
const config = await readJson(path.join(root, 'config/news-sources.json'));
const existing = await readJson(path.join(root, 'data/news/items.json'));
for (const key of ['dailyLimit', 'perSourceLimit', 'lookbackDays'])
  if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 100)
    throw new Error('Invalid config: ' + key);
const sources = config.sources.filter((source) => source.enabled);
if (!sources.length || sources.length > 10)
  throw new Error('Enable between 1 and 10 sources');
for (const source of sources) {
  canonicalUrl(source.feed, source.hosts);
  if (
    source.priority !== undefined &&
    (!Number.isInteger(source.priority) ||
      source.priority < 0 ||
      source.priority > 100)
  )
    throw new Error('Invalid source priority');
  if (
    source.dailyLimit !== undefined &&
    (!Number.isInteger(source.dailyLimit) ||
      source.dailyLimit < 1 ||
      source.dailyLimit > config.dailyLimit)
  )
    throw new Error('Invalid source daily limit');
}
const now = new Date();
const windowHours = Number(process.env.NEWS_WINDOW_HOURS || 48);
if (!Number.isInteger(windowHours) || windowHours < 1 || windowHours > config.lookbackDays * 24)
  throw new Error('NEWS_WINDOW_HOURS must be between 1 and lookbackDays * 24');
const report = {
  runAt: now.toISOString(),
  windowHours,
  since: new Date(now.getTime() - windowHours * 3600000).toISOString(),
  sources: [],
  summaryFailures: [],
  selected: [],
  mode: process.argv.includes('--write') ? 'pr-files' : 'preview',
};
const candidates = [];
for (const source of sources) {
  try {
    const result = await parseFeed(
      await fetchText(source.feed),
      source,
      now,
      config.lookbackDays,
    );
    candidates.push(...result.items);
    report.sources.push({
      source: source.name,
      status: 'ok',
      eligible: result.items.length,
      skipped: result.skipped,
      newestPublishedAt: result.items.map(item => item.publishedAt).sort().at(-1) || null,
      inWindow: result.items.filter(item => now - new Date(item.publishedAt) <= windowHours * 3600000).length,
    });
  } catch (error) {
    report.sources.push({
      source: source.name,
      status: 'failed',
      error: error.message,
    });
  }
}
report.rejected = [];
const relevant = candidates.flatMap((item) => {
  const assessment = assessRelevance(item);
  if (!assessment.accepted) {
    report.rejected.push({
      title: item.title,
      url: item.url,
      sourceId: item.sourceId,
      publishedAt: item.publishedAt,
      reason: assessment.reason,
    });
    return [];
  }
  return [
    {
      ...item,
      category: assessment.category,
      relevanceReason: assessment.reason,
    },
  ];
});
report.notSelected = [];
let selected = selectItems(relevant, existing, {...config, windowHours}, now, report.notSelected).map(publicNewsItem);
const summarized = [];
for (const item of selected) {
  try {
    summarized.push(await summarize(item));
  } catch {
    report.summaryFailures.push({
      id: item.id,
      source: item.sourceName,
      message:
        'Summary failed; retained source excerpt. Check provider settings.',
    });
    summarized.push(item);
  }
}
selected = summarized;
report.selected = selected.map(({ id, title, url, category, summaryKind, sourceId, publishedAt }) => ({
  id,
  title,
  url,
  category,
  summaryKind,
  sourceId,
  publishedAt,
}));
const outputRoot = process.argv.includes('--write')
  ? root
  : path.join(root, '.cache-loader/news-preview');
const all = radar
  .attachCoverage([...existing, ...selected], relevant.map(publicNewsItem), config)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
if (
  selected.length ||
  JSON.stringify(all) !== JSON.stringify(existing) ||
  !process.argv.includes('--write')
) {
  // The whole batch is calculated before any public content files are written.
  const days = new Set(
    (process.argv.includes('--write') ? selected : all).map((item) =>
      item.collectedAt.slice(0, 10),
    ),
  );
  for (const day of days)
    await save(
      path.join(outputRoot, 'src/pages/news/daily', day + '.md'),
      dailyMarkdown(
        day,
        all.filter((item) => item.collectedAt.startsWith(day)),
      ),
    );
  await save(
    path.join(outputRoot, 'data/news/items.json'),
    JSON.stringify(all, null, 2) + '\n',
  );
}
await save(
  path.join(root, '.cache-loader/news-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
const successful = report.sources.filter(
  (source) => source.status === 'ok',
).length;
const body = `## AI 资讯自动检查报告\n\n新增 ${selected.length} 条；来源成功 ${successful}/${sources.length}。主题筛选与数据检查后，需双语构建通过才能提交发布。规则不核验原始报道事实。详细原因见 news-report.json。\n`;
await save(path.join(root, '.cache-loader/news-pr.md'), body);
console.log(JSON.stringify(report, null, 2));
if (!successful) process.exitCode = 1;
