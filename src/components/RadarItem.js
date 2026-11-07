import { radarDay, radarDateTime } from "@site/src/utils/radar-date.mjs";
import { uiLabel } from "@site/src/utils/ui-labels";
import useSiteConfig from "@lab/runtime/context";
import { translate } from "@lab/runtime/Translate";
import React, { useState } from "react";
import { useText } from "@lab/components/Shell";
import Link from "@lab/runtime/Link";
import ReadingActions from "./ReadingActions";
import { localizedNews } from "@site/src/utils/news-locale.mjs";
import { useEnglish, Related } from "./ContentUI";
import ContentProvenance, { Freshness } from "./ContentProvenance";
import RadarPractice from "@lab/components/RadarPractice";
import SignalDates from "./SignalDates";
import RadarContent from "@lab/components/RadarContent";
export default function RadarItem({
  item,
  compact = false,
  showDate = true,
  contextFirst = false,
  headingAs: Heading = "h3",
  showFullContent = false,
}) {
  const en = useEnglish();
  const t = useText();
  const [expanded, setExpanded] = useState(false);
  const c = localizedNews(item, useSiteConfig().i18n.currentLocale);
  const summary = Array.from(c.summary || "");
  const title = (
    <Heading>
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        {c.title} ↗
      </a>
    </Heading>
  );
  const metadata = (
    <>
      <div className="radar-item-meta">
        <p className="hh-eyebrow">
          {uiLabel("RADAR / SIGNAL")} ·{" "}
          <span className="signal-category">{uiLabel(item.domain)}</span> ·{" "}
          {uiLabel(item.sourceType)}{" "}
          {showDate && (
            <>
              {" "}
              ·{" "}
              <time
                dateTime={item.publishedAt}
                title={radarDateTime(item.publishedAt) + " UTC+8"}
              >
                {radarDay(item.publishedAt)}
              </time>
            </>
          )}
        </p>
        <p className="hh-meta">
          {uiLabel("SOURCE STATUS")} ·{" "}
          {uiLabel(
            (item.verificationStatus || "unverified")
              .replaceAll("-", " ")
              .toUpperCase(),
          )}
        </p>
      </div>
      <SignalDates item={item} />
      <Freshness
        entry={{
          ...item,
          lastVerified: ["primary-confirmed", "cross-checked"].includes(
            item.verificationStatus,
          )
            ? item.verification?.checkedAt
            : undefined,
        }}
      />
    </>
  );
  return (
    <article
      id={"signal-" + item.id}
      className="radar-signal"
      data-category={item.domain}
    >
      {contextFirst ? (
        <>
          {title}
          <p className="hh-meta">
            {item.sourceName} · {uiLabel(item.domain)} ·{" "}
            <time dateTime={item.publishedAt}>
              {radarDay(item.publishedAt)}
            </time>
          </p>
          <details className="radar-source-details">
            <summary>
              {t(
                "来源、日期与核验详情",
                "Source, dates and verification",
                "來源、日期與核驗詳情",
              )}
            </summary>
            {metadata}
          </details>
        </>
      ) : (
        <>
          {metadata}
          {title}
        </>
      )}
      {item.originalTitle && item.originalTitle !== c.title && (
        <p className="hh-meta">
          {uiLabel("ORIGINAL SOURCE TITLE")} · {item.originalTitle}
        </p>
      )}
      <div className="radar-summary-meta">
        <p className="hh-meta">
          {uiLabel(c.fallback ? "SOURCE LANGUAGE" : "AI TRANSLATED")}
        </p>
        {c.summary && (
          <ContentProvenance
            kind={
              item.summaryKind === "ai-summary"
                ? "ai-summary"
                : "source-excerpt"
            }
          />
        )}
      </div>
      {c.summary && (
        <p id={`summary-${item.id}`} className="signal-summary">
          {!expanded && summary.length > 240
            ? summary.slice(0, 180).join("") + "…"
            : c.summary}
        </p>
      )}
      {!compact && !c.summary && (
        <p className="hh-meta">
          {t(
            "来源未提供可展示的摘要，可打开原文查看。",
            "No source excerpt is available. Open the original to read more.",
            "來源未提供可顯示的摘要，可開啟原文查看。",
          )}
        </p>
      )}
      {summary.length > 240 && (
        <button
          className="summary-expand"
          aria-expanded={expanded}
          aria-controls={`summary-${item.id}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? t("收起摘要", "Collapse summary", "收起摘要")
            : t("展开摘要", "Expand summary", "展開摘要")}
        </button>
      )}
      {showFullContent && <RadarContent item={item} />}
      {!compact && item.whyItMatters && (
        <>
          <p className="hh-eyebrow">{uiLabel("WHY IT MATTERS")}</p>
          <p>{item.whyItMatters}</p>
        </>
      )}
      {contextFirst && !compact && (
        <div className="radar-connections">
          <Related ids={item.related || []} />
          <RadarPractice id={item.id} expanded />
        </div>
      )}
      <div className="radar-item-actions">
        <a
          className="radar-source-link"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>
            {item.sourceName} ·{" "}
            {item.sourceType === "media"
              ? en
                ? "Source page"
                : translate({
                    id: "ui.05b0e77f21",
                    message: "\u6765\u6E90\u9875",
                  })
              : en
                ? "Source"
                : translate({
                    id: "ui.c63f79e636",
                    message: "\u6765\u6E90",
                  })}{" "}
          </span>
          <span aria-hidden="true">↗</span>
        </a>
        {!compact && <ReadingActions id={item.id} en={en} compact />}
      </div>
      {!compact && !contextFirst && <Related ids={item.related || []} />}{" "}
      {!compact && !contextFirst && <RadarPractice id={item.id} />}
      {!compact &&
        ["primary-confirmed", "cross-checked"].includes(
          item.verificationStatus,
        ) && (
          <details>
            <summary>
              {en
                ? "Verification evidence"
                : translate({
                    id: "ui.8215f33a20",
                    message: "\u6838\u9A8C\u4F9D\u636E",
                  })}
            </summary>
            <ul>
              {item.verification.evidence.map((e) => (
                <li key={e.url}>
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.note} ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      {!!item.coverage?.length && (
        <details>
          <summary>
            {en
              ? "Related coverage"
              : translate({
                  id: "ui.6b698bddf4",
                  message: "\u76F8\u5173\u62A5\u9053",
                })}{" "}
            · {item.coverage.length}
          </summary>
          <ul>
            {item.coverage.map((i) => (
              <li key={i.id}>
                <a href={i.url} target="_blank" rel="noopener noreferrer">
                  {i.sourceName} · {i.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
