"use client";
import { useEffect, useRef, useState } from "react";
import {
  readRadarFilters,
  filterRadarItems,
  radarFilterUrl,
} from "../lib/radar-filters.mjs";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import RadarItem from "@site/src/components/RadarItem";
import { domains } from "@site/src/utils/radar.cjs";
import { uiLabel } from "@site/src/utils/ui-labels";
export default function Radar() {
  const { items } = useSite(),
    t = useText(),
    [filters, setFilters] = useState({
      query: "",
      domain: "all",
      source: "all",
    }),
    [limit, setLimit] = useState(12);
  const pendingFocus = useRef(null);
  const { query, domain, source } = filters;
  const sources = [
    ...new Map(items.map((item) => [item.sourceId, item.sourceName])),
  ];
  const filtered = filterRadarItems(items, filters);
  const lastCollected = items
    .map((item) => item.collectedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  useEffect(() => {
    const restore = () => {
      const next = readRadarFilters(
        window.location.search,
        domains,
        items.map((item) => item.sourceId),
      );
      setFilters(next);
      const index = filterRadarItems(items, next).findIndex(
        (item) => "#signal-" + item.id === window.location.hash,
      );
      setLimit(Math.max(12, index + 1));
    };
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, [items]);
  useEffect(() => {
    if (pendingFocus.current) {
      document
        .getElementById(pendingFocus.current)
        ?.querySelector("h3 a")
        ?.focus();
      pendingFocus.current = null;
      return;
    }
    if (!window.location.hash.startsWith("#signal-")) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView(),
    );
    return () => cancelAnimationFrame(frame);
  }, [limit, filters]);
  function update(next) {
    const value = { ...filters, ...next };
    setFilters(value);
    setLimit(12);
    window.history.replaceState(
      window.history.state,
      "",
      radarFilterUrl(window.location.href, value),
    );
  }
  const active = query || domain !== "all" || source !== "all";
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
        {lastCollected && (
          <p className="radar-intake hh-meta">
            {t("最近收录", "Latest addition", "最近收錄")} ·{" "}
            <time dateTime={lastCollected}>
              {lastCollected.slice(0, 16).replace("T", " ")} UTC
            </time>
            <br />
            {t(
              "时间轴按来源发布时间排列；收录时间不代表采集任务的最后运行时间。",
              "The timeline follows source publication dates. Latest addition is not the last crawler run.",
              "時間軸按來源發佈時間排列；收錄時間不代表採集任務的最後執行時間。",
            )}
          </p>
        )}
      </header>
      <div className="filter-bar">
        <label htmlFor="radar-query">
          {t("搜索资讯", "Search signals", "搜尋資訊")}
        </label>
        <input
          id="radar-query"
          value={query}
          onChange={(e) => {
            update({ query: e.target.value });
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
            update({ domain: e.target.value });
          }}
        >
          <option value="all">{t("全部方向", "All topics", "全部方向")}</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {uiLabel(d)}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="radar-source">
          {t("来源", "Source", "來源")}
        </label>
        <select
          id="radar-source"
          value={source}
          onChange={(e) => update({ source: e.target.value })}
        >
          <option value="all">
            {t("全部来源", "All sources", "全部來源")}
          </option>
          {sources.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="results-toolbar">
        <p role="status">
          {t(
            `找到 ${filtered.length} 条资讯 · 显示 ${Math.min(limit, filtered.length)} 条`,
            `${filtered.length} signals · ${Math.min(limit, filtered.length)} shown`,
            `找到 ${filtered.length} 條資訊 · 顯示 ${Math.min(limit, filtered.length)} 條`,
          )}
        </p>
        {active && (
          <button
            onClick={() => update({ query: "", domain: "all", source: "all" })}
          >
            {t("清除筛选", "Clear filters", "清除篩選")}
          </button>
        )}
      </div>
      <div className="radar-stream">
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
                update({ query: "", domain: "all", source: "all" });
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
                  <time dateTime={i.publishedAt}>
                    {i.publishedAt.slice(0, 10)}
                  </time>
                ) : null}
              </div>
              <RadarItem item={i} />
            </div>
          ))
        )}
      </div>
      {filtered.length > limit && (
        <button
          onClick={() => {
            pendingFocus.current = "signal-" + filtered[limit].id;
            setLimit(limit + 12);
          }}
        >
          {t("加载更多", "Load more", "載入更多")}
        </button>
      )}
    </main>
  );
}
