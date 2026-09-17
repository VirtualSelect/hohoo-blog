// Locale changes open the same page from the top. A previous TOC, skip-link,
// or Radar fragment describes an earlier navigation, not the language action.
export function languageUrl(locale, route, currentHref) {
  const url = new URL(currentHref);
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  return prefix + "/" + route + url.search;
}
