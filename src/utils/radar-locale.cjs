// Build-time projection: retain source provenance without shipping other locale bodies.
function projectSignal(item, locale) {
  const key = locale === 'zh-CN' ? 'zh' : locale;
  const t = item.translations?.[key];
  const searchText = [
    item.title,
    item.titleZh,
    ...Object.values(item.translations || {}).map((x) => x.title),
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(' ');
  const { translations, ...source } = item;
  return {
    ...source,
    originalTitle: item.originalTitle || item.title,
    locale,
    title: t?.title || (key === 'zh' ? item.titleZh : undefined) || item.title,
    summary: t?.summary ?? item.originalSummary ?? item.summary,
    whyItMatters:
      t?.whyItMatters || (locale === 'zh-CN' ? item.whyItMatters : undefined),
    translationStatus: t ? 'AI_TRANSLATED' : 'ORIGINAL',
    searchText,
  };
}
module.exports = { projectSignal };
