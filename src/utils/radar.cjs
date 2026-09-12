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

const sourceTypes = [
  'primary',
  'official',
  'paper',
  'media',
  'aggregator',
  'community',
];
function sourceType(item, config) {
  const source = config.sources.find((s) => s.id === item.sourceId);
  if (!source) throw Error('Unknown Radar source: ' + item.sourceId);
  const host = new URL(item.url).hostname;
  if (source.hosts && !source.hosts.includes(host)) return 'community';
  if (source.aggregator) return 'aggregator';
  return sourceTypes.includes(source.type) ? source.type : 'community';
}
function canonicalURL(value) {
  const u = new URL(value);
  u.hash = '';
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  u.pathname = u.pathname.replace(/\/$/, '') || '/';
  return u.href;
}
function verification(item) {
  const record = item.verification;
  // Publication approval, source count and official branding are not fact checks.
  if (
    record &&
    ['primary-confirmed', 'cross-checked'].includes(record.status) &&
    record.checkedBy &&
    Number.isFinite(Date.parse(record.checkedAt))
  ) {
    const urls = [
      ...new Set(
        (record.evidence || [])
          .filter((e) => e.url && /^https:\/\//.test(e.url) && e.note)
          .map((e) => e.url),
      ),
    ];
    const primary = record.evidence?.some(
      (e) => e.kind === 'primary' && urls.includes(e.url),
    );
    if (
      (record.status === 'primary-confirmed' && primary) ||
      (record.status === 'cross-checked' &&
        new Set(urls.map((u) => new URL(u).hostname)).size >= 2)
    )
      return record.status;
  }
  return item.sourceType === 'community' ? 'community-signal' : 'single-source';
}
function stableId(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++)
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return 'event-' + (h >>> 0).toString(16);
}
function signals(items, config) {
  const groups = [];
  const unique = new Map();
  for (const item of items)
    for (const member of [item, ...(item.coverage || [])])
      if (!unique.has(member.id)) unique.set(member.id, member);
  for (const item of unique.values()) {
    if (!/^https:\/\//.test(item.url)) throw Error('Unsafe Radar URL');
    const url = canonicalURL(item.url);
    const title = item.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const enriched = {
      ...item,
      domain: classifySignal(item),
      sourceType: sourceType(item, config),
      coverage: [],
    };
    enriched.verificationStatus = verification(enriched);
    if (!domains.includes(enriched.domain)) throw Error('Invalid Radar domain');
    const key = item.eventId || item.clusterId;
    const group = groups.find((g) =>
      g.members.some(
        (m) =>
          (key && (m.eventId === key || m.clusterId === key)) ||
          canonicalURL(m.url) === url ||
          (Math.abs(Date.parse(item.publishedAt) - Date.parse(m.publishedAt)) <=
            72 * 3600000 &&
            ((item.contentHash && item.contentHash === m.contentHash) ||
              (title.length > 8 &&
                title ===
                  m.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')))),
      ),
    );
    if (group) group.members.push(enriched);
    else groups.push({ members: [enriched] });
  }
  const rank = {
    primary: 0,
    official: 1,
    paper: 2,
    media: 3,
    aggregator: 4,
    community: 5,
  };
  return groups
    .map((g) => {
      const members = g.members.sort(
        (a, b) =>
          rank[a.sourceType] - rank[b.sourceType] || a.id.localeCompare(b.id),
      );
      const first = members[0];
      const eventId =
        members.find((m) => m.eventId)?.eventId ||
        members.find((m) => m.clusterId)?.clusterId ||
        stableId(members.map((m) => m.id).sort()[0]);
      return {
        ...first,
        eventId,
        clusterId: eventId,
        coverage: members.slice(1),
      };
    })
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
    );
}
function attachCoverage(published, candidates, config) {
  const known = published.map((item) => ({
    ...item,
    eventId: item.eventId || stableId(item.id),
  }));
  const groups = signals(
    [
      ...known,
      ...candidates.filter((i) => !(config.blockedUrls || []).includes(i.url)),
    ],
    config,
  );
  return known.map((item) => {
    const group = groups.find((g) =>
      [g, ...g.coverage].some((m) => m.id === item.id),
    );
    const coverage = [group, ...group.coverage]
      .filter((m) => m.id !== item.id)
      .map(
        ({
          coverage,
          domain,
          sourceType,
          verificationStatus,
          clusterId,
          ...m
        }) => m,
      );
    return { ...item, coverage };
  });
}
module.exports = {
  domains,
  classifySignal,
  isoWeek,
  signals,
  sourceType,
  verification,
  canonicalURL,
  attachCoverage,
};
