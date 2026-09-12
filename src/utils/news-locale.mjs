export function localizedNews(item, locale) {
  if (item.locale)
    return {
      title: item.title,
      summary: item.summary,
      fallback: item.translationStatus !== 'AI_TRANSLATED',
    };
  const language = locale === 'en' ? 'en' : locale === 'zh-TW' ? 'zh-TW' : 'zh';
  const translated = item.translations?.[language];
  return {
    title:
      translated?.title ||
      (language === 'zh' ? item.titleZh : '') ||
      item.title,
    summary: translated?.summary ?? item.originalSummary ?? item.summary,
    fallback: !translated,
  };
}
