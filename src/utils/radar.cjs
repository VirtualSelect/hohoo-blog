const domains = [
  'models',
  'agents',
  'ai-coding',
  'rag',
  'multimodal',
  'embodied-ai',
  'research',
  'infra',
];
function classifySignal(item) {
  const text = item.title + ' ' + (item.originalSummary || item.summary || '');
  const rules = [
    ['embodied-ai', /robot|embodied|\bvla\b|具身|机器人/i],
    ['ai-coding', /codex|mcp|coding|harness|编程|代码助手/i],
    ['rag', /\brag\b|retriev|rerank|检索/i],
    ['agents', /agent|tool.call|智能体|工具调用/i],
    ['multimodal', /multimodal|vision|voice|image|语音|视觉|多模态/i],
    ['infra', /infrastructure|vllm|sglang|gradio|workflow|部署|吞吐/i],
    ['research', /arxiv|paper|论文/i],
  ];
  return (
    item.radarDomain || rules.find(([, r]) => r.test(text))?.[0] || 'models'
  );
}
function isoWeek(value) {
  const d = new Date(value);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const week = Math.ceil(
    ((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7,
  );
  return year + '-W' + String(week).padStart(2, '0');
}
function sourceType(item, config) {
  const source = config.sources.find((s) => s.id === item.sourceId);
  if (!source) throw Error('Unknown Radar source: ' + item.sourceId);
  if (source.aggregator) return 'media';
  if (
    source.id === 'huggingface' &&
    /\/blog\/[^/]+\//.test(new URL(item.url).pathname)
  )
    return 'community';
  return source.type || 'official';
}
function signals(items, config) {
  const groups = new Map();
  for (const item of items) {
    if (!/^https:\/\//.test(item.url)) throw Error('Unsafe Radar URL');
    const normalized = item.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const key =
      item.eventId || normalized + '|' + item.publishedAt.slice(0, 10);
    const type = sourceType(item, config);
    const enriched = {
      ...item,
      domain: classifySignal(item),
      sourceType: type,
      coverage: [],
    };
    if (!domains.includes(enriched.domain)) throw Error('Invalid Radar domain');
    const existing = groups.get(key);
    if (!existing) groups.set(key, enriched);
    else if (type === 'official' && existing.sourceType !== 'official') {
      enriched.coverage = [existing, ...existing.coverage];
      groups.set(key, enriched);
    } else existing.coverage.push(enriched);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
  );
}
module.exports = { domains, classifySignal, isoWeek, signals };
