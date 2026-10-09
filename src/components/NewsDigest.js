import { radarDay, radarDateTime } from "@site/src/utils/radar-date.mjs";
import ReadingActions from "@site/src/components/ReadingActions";
import SignalDates from "./SignalDates";
import React from "react";
import Link from "@lab/runtime/Link";
import useSiteConfig from "@lab/runtime/context";
import { useSite } from "@lab/runtime/context";
import { localizedNews } from "@site/src/utils/news-locale.mjs";
import { useText } from "@lab/components/Shell";

export default function NewsDigest({ day }) {
  const { items: news } = useSite();
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
      <Link to="/radar">{t("返回资讯列表", "All AI news", "返回資訊列表")}</Link>
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
                  ? t("原文内容 · 暂无该语言译文", "Original text · Translation unavailable", "原文內容 · 暫無該語言譯文")
                  : t("AI 辅助翻译 · 请核对原文", "AI-assisted translation · Check the source", "AI 輔助翻譯 · 請核對原文")}
              </small>
              <p>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {t("阅读原文 ↗", "Read original ↗", "閱讀原文 ↗")}
                </a>
              </p>
              <ReadingActions id={item.id} en={en} />
            </article>
          );
        })}
    </section>
  );
}
