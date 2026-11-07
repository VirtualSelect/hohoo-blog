"use client";
import { useEffect, useState } from "react";
import {
  sourceArticleUrl,
  validFeedContent,
} from "@site/src/utils/radar-content.mjs";
import { useText } from "./Shell";

export default function RadarContent({ item }) {
  const t = useText();
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const url = item.feedContentUrl;
  useEffect(() => {
    if (!url || !/^\/radar-content\/[a-f0-9]{20}-[a-f0-9]{16}\.json$/.test(url))
      return;
    const controller = new AbortController();
    let active = true;
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("RSS text unavailable");
        const value = await response.json();
        if (value.id !== item.id || !validFeedContent(value))
          throw new Error("Invalid RSS text");
        if (active) setResult({ url, value });
      })
      .catch((error) => {
        if (active && error.name !== "AbortError")
          setResult({ url, error: true });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, item.id, attempt]);
  const original = sourceArticleUrl(item.sourceArticleUrl);
  if (!url)
    return (
      <div className="flow-content-note">
        <p>
          {item.feedContentStatus === "summary-only"
            ? t(
                "AIHOT 的全文 RSS 未为这条资讯提供正文，目前只有上方摘要。",
                "AIHOT's full RSS provides only an excerpt for this signal, not an article body.",
                "AIHOT 的全文 RSS 未為這則資訊提供正文，目前只有上方摘要。",
              )
            : t(
                "这条历史归档目前只有摘要，未保存 RSS 正文。",
                "This archived signal has an excerpt only; no RSS body was saved.",
                "這則歷史歸檔目前只有摘要，未保存 RSS 正文。",
              )}
        </p>
        {original && (
          <a href={original} target="_blank" rel="noopener noreferrer">
            {t("查看原始报道", "Read the original report", "查看原始報導")} ↗
          </a>
        )}
      </div>
    );
  const current = result?.url === url ? result : null;
  if (!current)
    return (
      <p className="flow-content-note" role="status">
        {t("正在载入 RSS 正文…", "Loading RSS text…", "正在載入 RSS 正文…")}
      </p>
    );
  if (current.error)
    return (
      <div className="flow-content-note" role="status">
        <p>
          {t(
            "正文暂时无法载入，摘要和来源链接仍可使用。",
            "The RSS text could not be loaded. The excerpt and source links are still available.",
            "正文暫時無法載入，摘要和來源連結仍可使用。",
          )}
        </p>
        <button
          onClick={() => {
            setResult(null);
            setAttempt((n) => n + 1);
          }}
        >
          {t("重试正文", "Retry text", "重試正文")} ↻
        </button>
      </div>
    );
  return (
    <section
      className="flow-rss-content"
      aria-label={t("RSS 正文", "RSS text", "RSS 正文")}
    >
      <header>
        <h3>{t("RSS 正文", "RSS text", "RSS 正文")}</h3>
        <p>
          {t(
            "AIHOT 全文源提供 · 来源语言 · 文本版",
            "Provided by AIHOT's full feed · Source language · Text version",
            "AIHOT 全文源提供 · 來源語言 · 文字版",
          )}
        </p>
      </header>
      <div lang={current.value.language}>
        {current.value.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {original && (
        <a
          className="flow-original-report"
          href={original}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("查看原始报道", "Read the original report", "查看原始報導")} ↗
        </a>
      )}
    </section>
  );
}
