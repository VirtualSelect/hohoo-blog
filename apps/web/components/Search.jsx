"use client";
import { useEffect, useRef, useState } from "react";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Translate from "../runtime/Translate";
import Link from "../runtime/Link";
import { searchEntries } from "@site/src/utils/search.mjs";
import { writingEntries } from "@site/src/utils/localization.cjs";
import { uiLabel } from "@site/src/utils/ui-labels";
export default function Search({ onClose }) {
  const { searchUrl, globalData } = useSite(),
    t = useText(),
    ref = useRef(null),
    [query, setQuery] = useState("");
  const [search, setSearch] = useState([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(searchUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Search unavailable");
        return response.json();
      })
      .then((entries) => {
        if (!Array.isArray(entries)) throw new Error("Invalid index");
        setSearch(entries);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [searchUrl, attempt]);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    d.querySelector("input")?.focus({ preventScroll: true });
    return () => d.close();
  }, []);
  const hasQuery = Boolean(query.trim());
  const results = hasQuery
    ? searchEntries(search, query).slice(0, 18)
    : writingEntries(globalData["content-index"].entries).slice(0, 3);
  function closeSearch() {
    ref.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={ref}
      className="lab-search"
      aria-labelledby="search-title"
      onCancel={(e) => {
        e.preventDefault();
        closeSearch();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      <div>
        <header>
          <h2 id="search-title">
            {t("搜索知识与实践", "Search the Lab", "搜尋知識與實作")}
          </h2>
          <button onClick={closeSearch} aria-label={t("关闭", "Close", "關閉")}>
            Esc ×
          </button>
        </header>
        <label htmlFor="lab-query">
          {t(
            "搜索标题、摘要，支持 type:paper 等筛选",
            "Search titles and summaries; try type:paper",
            "搜尋標題、摘要，支援 type:paper 等篩選",
          )}
        </label>
        <input
          id="lab-query"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "想了解什么？",
            "What are you looking for?",
            "想瞭解什麼？",
          )}
        />
        {!hasQuery && (
          <div className="search-start">
            <p className="eyebrow">
              {t("从这里开始", "Start here", "從這裡開始")}
            </p>
            <div className="inline-links">
              <Link to="/journey" onClick={closeSearch}>
                <Translate id="journey.nav" /> →
              </Link>
              <Link to="/build" onClick={closeSearch}>
                {t("项目与实验", "Projects & labs", "專案與實驗")} →
              </Link>
              <Link to="/radar" onClick={closeSearch}>
                {t("AI 雷达", "AI Radar", "AI 雷達")} →
              </Link>
            </div>
            <p className="eyebrow">
              {t("最近发布", "Recent writing", "最近發佈")}
            </p>
          </div>
        )}
        <p className="hh-meta" role="status">
          {hasQuery
            ? t(
                `显示 ${results.length} 条结果（最多 18 条）`,
                `Showing ${results.length} results (up to 18)`,
                `顯示 ${results.length} 條結果（最多 18 條）`,
              )
            : ""}
        </p>
        <div>
          {hasQuery && status !== "ready" ? (
            <p role="status">
              {status === "loading" ? (
                t("正在加载搜索索引…", "Loading search…", "正在載入搜尋索引…")
              ) : (
                <button onClick={() => setAttempt((value) => value + 1)}>
                  {t(
                    "搜索加载失败，重试",
                    "Search unavailable. Retry",
                    "搜尋載入失敗，重試",
                  )}
                </button>
              )}
            </p>
          ) : hasQuery && !results.length ? (
            <p className="empty">
              {t(
                "没有匹配的内容，试试其他关键词。",
                "No matches. Try another keyword.",
                "沒有符合的內容，試試其他關鍵字。",
              )}
            </p>
          ) : (
            results.map((e) => (
              <Link
                onClick={closeSearch}
                className="search-result"
                key={e.id}
                to={e.href}
              >
                <span className="eyebrow">
                  {e.type === "learning" ? (
                    <Translate id="journey.roadmapLabel" />
                  ) : (
                    uiLabel(e.type.toUpperCase())
                  )}
                </span>
                <strong>{e.title}</strong>
                <small>{e.description}</small>
              </Link>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
