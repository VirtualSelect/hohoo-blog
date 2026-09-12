const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
function renderFeed(items, siteUrl, locale) {
  const en = locale === "en";
  const language = en ? "en" : "zh";
  const base = siteUrl.replace(/\/$/, "");
  const prefix = en ? "/en" : "";
  const entries = [...items]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 100);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>' +
    `<title>${en ? "Hohoo AI news" : "Hohoo AI 资讯"}</title><link>${escape(base + prefix + "/news")}</link><description>${en ? "Research-focused source excerpts, automatically filtered." : "经过自动规则筛选的研究资讯摘录，附来源入口。"}</description><language>${en ? "en" : "zh-CN"}</language>` +
    `<atom:link href="${escape(base + prefix + "/news/rss.xml")}" rel="self" type="application/rss+xml"/>` +
    entries
      .map((item) => {
        const translated = item.translations?.[language];
        const title = translated?.title || item.title;
        const summary =
          translated?.summary ?? item.originalSummary ?? item.summary;
        return `<item><title>${escape(title)}</title><link>${escape(item.url)}</link><guid isPermaLink="false">hohoo-news:${escape(item.id)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><category>${escape(item.category)}</category><description>${escape(item.sourceName + ": " + summary)}</description></item>`;
      })
      .join("") +
    "</channel></rss>\n"
  );
}
module.exports = { renderFeed };
