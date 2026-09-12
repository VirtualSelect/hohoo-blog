"use client";
import { useState } from "react";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import RadarItem from "@site/src/components/RadarItem";
import { domains } from "@site/src/utils/radar.cjs";
import { uiLabel } from "@site/src/utils/ui-labels";
export default function Radar() {
  const { items } = useSite(),
    t = useText(),
    [query, setQuery] = useState(""),
    [domain, setDomain] = useState("all"),
    [limit, setLimit] = useState(12);
  const filtered = items.filter(
    (i) =>
      (domain === "all" || i.domain === domain) &&
      [i.title, i.summary, i.searchText]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <main className="hh-page radar-page">
      <header className="page-intro">
        <p className="eyebrow">
          {t(
            "发现 / 外部信号",
            "Discover / External signals",
            "發現 / 外部訊號",
          )}
        </p>
        <h1>{t("AI 雷达", "AI Radar", "AI 雷達")}</h1>
        <p>
          {t(
            "关注值得深入的变化，保留每一条信息的来源。",
            "Signals worth exploring, with sources you can trace.",
            "關注值得深入的變化，保留每一條資訊的來源。",
          )}
        </p>
        <div className="inline-links">
          <Link to="/reading">{t("稍后读", "Saved", "稍後讀")} →</Link>
          <Link to="/radar/weekly">
            {t("每周回顾", "Weekly archive", "每週回顧")} →
          </Link>
          <Link to="/subscribe">RSS ↗</Link>
        </div>
      </header>
      <div className="filter-bar">
        <label htmlFor="radar-query">
          {t("搜索资讯", "Search signals", "搜尋資訊")}
        </label>
        <input
          id="radar-query"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(12);
          }}
          placeholder={t(
            "标题、摘要、关键词…",
            "Title, summary, keywords…",
            "標題、摘要、關鍵字…",
          )}
        />
        <label className="sr-only" htmlFor="radar-domain">
          {t("分类", "Category", "分類")}
        </label>
        <select
          id="radar-domain"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            setLimit(12);
          }}
        >
          <option value="all">{t("全部方向", "All topics", "全部方向")}</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {uiLabel(d)}
            </option>
          ))}
        </select>
      </div>
      <div className="radar-stream" aria-live="polite">
        {!filtered.length ? (
          <div className="empty">
            <h2>
              {t("没有匹配的资讯", "No matching signals", "沒有符合的資訊")}
            </h2>
            <p>
              {t(
                "试试其他关键词，或清除筛选条件。",
                "Try another keyword or clear your filters.",
                "試試其他關鍵字，或清除篩選條件。",
              )}
            </p>
            <button
              onClick={() => {
                setQuery("");
                setDomain("all");
              }}
            >
              {t("清除筛选", "Clear filters", "清除篩選")}
            </button>
          </div>
        ) : (
          filtered.slice(0, limit).map((i, index) => (
            <div className="radar-event" key={i.id}>
              <div className="radar-date">
                {index === 0 ||
                filtered[index - 1].publishedAt.slice(0, 10) !==
                  i.publishedAt.slice(0, 10) ? (
                  <time>{i.publishedAt.slice(0, 10)}</time>
                ) : null}
              </div>
              <RadarItem item={i} />
            </div>
          ))
        )}
      </div>
      {filtered.length > limit && (
        <button onClick={() => setLimit(limit + 12)}>
          {t("加载更多", "Load more", "載入更多")}
        </button>
      )}
    </main>
  );
}
