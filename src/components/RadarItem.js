import { uiLabel } from "@site/src/utils/ui-labels";
import useSiteConfig from "@lab/runtime/context";
import { translate } from "@lab/runtime/Translate";
import React from "react";
import Link from "@lab/runtime/Link";
import ReadingActions from "./ReadingActions";
import { localizedNews } from "@site/src/utils/news-locale.mjs";
import { useEnglish, Related } from "./ContentUI";
import ContentProvenance, { Freshness } from "./ContentProvenance";
import RadarPractice from "@lab/components/RadarPractice";
export default function RadarItem({ item, compact = false }) {
  const en = useEnglish();
  const c = localizedNews(item, useSiteConfig().i18n.currentLocale);
  return (
    <article id={"signal-" + item.id}>
      <div className="radar-item-meta">
        <p className="hh-eyebrow">
          {uiLabel("RADAR / SIGNAL")} · {uiLabel(item.domain)} ·{" "}
          {uiLabel(item.sourceType)} ·{" "}
          <time dateTime={item.publishedAt}>
            {item.publishedAt.slice(0, 10)}
          </time>
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
      <h3>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {c.title} ↗
        </a>
      </h3>
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
      {c.summary && <p>{c.summary}</p>}
      {!compact && item.whyItMatters && (
        <>
          <p className="hh-eyebrow">{uiLabel("WHY IT MATTERS")}</p>
          <p>{item.whyItMatters}</p>
        </>
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
      {!compact && <Related ids={item.related || []} />}{" "}
      {!compact && <RadarPractice id={item.id} />}
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
