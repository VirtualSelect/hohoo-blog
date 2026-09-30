// Locale changes open the same page from the top. A previous TOC, skip-link,
// or Radar fragment describes an earlier navigation, not the language action.
import type { Locale } from "./site-types.ts";
export function languageUrl(
  locale: Locale,
  route: string,
  currentHref: string,
) {
  const url = new URL(currentHref);
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  return prefix + "/" + route + url.search;
}
