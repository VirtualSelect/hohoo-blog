import { locales, getContent } from "../lib/content";
export default function sitemap() {
  return locales.flatMap((locale) =>
    getContent(locale)
      .routes.filter((route) => {
        const doc = getContent(locale).documents.find((d) => d.route === route);
        return !doc?.sourceFallback || doc.frontMatter.landing;
      })
      .map((route) => ({
        url:
          "https://huhohoo.com" +
          (locale === "zh-CN" ? "" : "/" + locale) +
          "/" +
          route,
      })),
  );
}
