const locales = ['zh-CN', 'zh-TW', 'en'];
function localePrefix(locale) {
  return locale === 'zh-CN' ? '' : '/' + locale;
}
function translationStatus(meta, locale) {
  if (locale === (meta?.sourceLocale || 'zh-CN')) return 'ORIGINAL';
  const record = meta?.translations?.[locale];
  if (
    !record ||
    !['AI_TRANSLATED', 'REVIEWED', 'OUTDATED'].includes(record.status)
  )
    return 'MISSING';
  if (
    record.status === 'OUTDATED' ||
    (meta.sourceRevision && record.sourceRevision !== meta.sourceRevision) ||
    (meta.sourceUpdatedAt &&
      record.translatedAt &&
      meta.sourceUpdatedAt > record.translatedAt)
  )
    return 'OUTDATED';
  return record.status;
}
function writingEntries(entries) {
  return entries
    .filter(
      (e) =>
        ['doc', 'note', 'paper', 'blog'].includes(e.type) &&
        e.status === 'published' &&
        e.translationStatus !== 'MISSING',
    )
    .sort(
      (a, b) =>
        (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id),
    );
}
module.exports = { locales, localePrefix, translationStatus, writingEntries };
