export function localizedNews(item, locale) {
  const language = locale === 'en' ? 'en' : 'zh';
  const translated = item.translations?.[language];
  return {
    title: translated?.title || (language === 'zh' ? item.titleZh : '') || item.title,
    summary: translated?.summary ?? item.originalSummary ?? item.summary,
    fallback: !translated,
  };
}
