import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import { useContent } from "../components/ContentUI";
import WritingList from "../components/WritingList";
import { writingEntries } from "../utils/localization.cjs";
import {
  writingKinds,
  writingKind,
  writingFilters,
  filterWriting,
} from "../utils/writing-kinds.ts";
import { matchesReadingQuery } from "@lab/lib/reading-paths.mjs";
import { useText } from "@lab/components/Shell";
import ResearchIndex from "@lab/components/ResearchIndex";
import SeriesShelf from "@lab/components/SeriesShelf";
import type { WritingFilters } from "../utils/writing-kinds.ts";
const defaults: WritingFilters = { kind: "all", domain: "all", type: "all" };
export default function Articles() {
  const { entries } = useContent(),
    t = useText();
  const writing = writingEntries(entries);
  const [filters, setFilters] = useState(defaults);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const sync = () => {
      setFilters(writingFilters(location.search));
      const params = new URLSearchParams(location.search);
      setQuery(params.get("q") || "");
      setShowAll(params.get("view") === "list");
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function updateFilters(next: WritingFilters) {
    setFilters(next);
    const url = new URL(location.href);
    url.hash = "";
    for (const [key, value] of Object.entries(next)) {
      if (value === "all") url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.pushState(history.state, "", url.pathname + url.search);
  }
  function updateQuery(value: string) {
    setQuery(value);
    const url = new URL(location.href);
    url.hash = "";
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    history.replaceState(history.state, "", url.pathname + url.search);
  }
  const filtered =
    !!query.trim() || Object.values(filters).some((value) => value !== "all");
  const visible = filterWriting(writing, filters).filter((entry) =>
    matchesReadingQuery(query, entry.title, entry.description),
  );
  return (
    <Layout
      title={t("文章", "Writing", "文章")}
      description={t(
        "查找标题、关键词，或按研究方向筛选已发表文章。",
        "Find published articles by title, keyword or research direction.",
        "查找標題、關鍵字，或依研究方向篩選已發表文章。",
      )}
    >
      <main className="hh-page focused-articles atlas-library">
        <header className="focused-heading atlas-page-heading">
          <div className="atlas-page-context">
            <p className="lab-page-label">LIBRARY / 01</p>
            <p>
              {t(
                "教程、实验与随笔",
                "Tutorials, experiments & reflections",
                "教學、實驗與隨筆",
              )}
            </p>
            <span className="atlas-content-count">
              {writing.length}{" "}
              {t("篇已发表内容", "published entries", "篇已發表內容")}
            </span>
          </div>
          <div className="atlas-page-title">
            <h1>{t("文章与研究", "Writing & research", "文章與研究")}</h1>
            <p>
              {t(
                "从一个具体问题出发，阅读实现、解释与实验记录。",
                "Explore implementations, explanations and recorded experiments, one question at a time.",
                "從一個具體問題出發，閱讀實作、解釋與實驗紀錄。",
              )}
            </p>
          </div>
        </header>
        <section
          className="atlas-explorer-tools"
          aria-label={t("查找文章", "Find writing", "查找文章")}
        >
          <div className="reading-search">
            <label htmlFor="writing-query">
              {t("查找文章", "Find an article", "查找文章")}
            </label>
            <input
              id="writing-query"
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder={t(
                "搜索标题或关键词，例如：超时、缓存",
                "Search titles or keywords, e.g. timeout, cache",
                "搜尋標題或關鍵字，例如：逾時、快取",
              )}
            />
          </div>
          <details
            className="reading-options"
            open={Object.values(filters).some((value) => value !== "all")}
          >
            <summary>
              {t(
                "按方向或类型筛选",
                "Filter by direction or type",
                "依方向或類型篩選",
              )}
            </summary>
            <ResearchIndex
              compact
              entries={writing}
              selected={filters.domain}
              onSelect={(domain) => updateFilters({ ...filters, domain })}
            />
            <label className="writing-kind-select">
              {t("文章类型", "Article type", "文章類型")}
              <select
                value={filters.kind}
                onChange={(event) =>
                  updateFilters({
                    ...filters,
                    kind: event.target.value as WritingFilters["kind"],
                    type: "all",
                  })
                }
              >
                <option value="all">
                  {t("全部类型", "All types", "全部類型")}
                </option>
                {Object.keys(writingKinds)
                  .filter((kind) =>
                    writing.some((entry) => writingKind(entry) === kind),
                  )
                  .map((kind) => (
                    <option key={kind} value={kind}>
                      {t(...writingKinds[kind as keyof typeof writingKinds])}
                    </option>
                  ))}
              </select>
            </label>
          </details>
        </section>
        <div className="reading-result-count" role="status">
          <span>
            {filtered
              ? `${visible.length} ${t("篇匹配文章", "matching articles", "篇符合文章")}`
              : t("最近更新", "Recent writing", "最近更新")}
          </span>
          {filtered && (
            <button
              onClick={() => {
                updateQuery("");
                updateFilters(defaults);
              }}
            >
              {t("清除条件", "Clear conditions", "清除條件")}
            </button>
          )}
        </div>
        <WritingList items={filtered ? visible : visible.slice(0, 6)} />
        {!filtered && visible.length > 6 && (
          <details
            className="writing-complete"
            open={showAll}
            onToggle={(event) => {
              const open = event.currentTarget.open;
              if (open === showAll) return;
              setShowAll(open);
              const url = new URL(location.href);
              if (open) url.searchParams.set("view", "list");
              else url.searchParams.delete("view");
              history.replaceState(
                history.state,
                "",
                url.pathname + url.search + url.hash,
              );
            }}
          >
            <summary>
              {t("继续查看全部文章", "Browse all writing", "繼續查看全部文章")}{" "}
              · {writing.length}
            </summary>
            <WritingList items={visible.slice(6)} />
          </details>
        )}
        <details className="writing-series">
          <summary>
            {t(
              "想系统读？查看系列入口",
              "Want a sequence? Explore the series",
              "想系統讀？查看系列入口",
            )}
          </summary>
          <SeriesShelf entries={writing} />
        </details>
      </main>
    </Layout>
  );
}
