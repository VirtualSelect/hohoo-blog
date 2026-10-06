import { radarDay, radarDateTime } from "@site/src/utils/radar-date.mjs";
import ReadingActions from "@site/src/components/ReadingActions";
import SignalDates from "./SignalDates";
import React from "react";
import Link from "@lab/runtime/Link";
import useSiteConfig from "@lab/runtime/context";
import news from "@site/data/news/items.json";
import { localizedNews } from "@site/src/utils/news-locale.mjs";
import { useText } from "@lab/components/Shell";

export default function NewsDigest({ day }) {
  const {
    i18n: { currentLocale },
  } = useSiteConfig();
  const en = currentLocale === "en";
  const t = useText();
  return (
    <section>
      <p>
        {t(
          "按本站收录日期（UTC）归档，不代表事件发生于当天；原公告、聚合源发布与收录时间分别标注。",
          "Archived by collection date (UTC), not the event date. Original announcement, source publication and collection dates are distinguished.",
          "依本站收錄日期（UTC）歸檔，不代表事件發生於當天；原公告、聚合來源發布與收錄時間分別標示。",
        )}
      </p>
      <Link to="/radar">{en ? "All AI news" : "返回资讯列表"}</Link>
      {news
        .filter((item) => item.collectedAt.startsWith(day))
        .map((item) => {
          const content = localizedNews(item, currentLocale);
          return (
            <article key={item.id}>
              <h2>{content.title}</h2>
              <p>
                {item.sourceName} ·{" "}
                <time
                  dateTime={item.publishedAt}
                  title={radarDateTime(item.publishedAt) + " UTC+8"}
                >
                  {radarDay(item.publishedAt)}
                </time>
              </p>
              <SignalDates item={item} />
              <p>{content.summary}</p>
              <small>
                {content.fallback
                  ? en
                    ? "Original text · Translation unavailable"
                    : "原文内容 · 暂无该语言译文"
                  : en
                    ? "AI-assisted translation · Check the source"
                    : "AI 辅助翻译 · 请核对原文"}
              </small>
              <p>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {en ? "Read original ↗" : "阅读原文 ↗"}
                </a>
              </p>
              <ReadingActions id={item.id} en={en} />
            </article>
          );
        })}
    </section>
  );
}
