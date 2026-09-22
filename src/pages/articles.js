import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import { useContent } from "../components/ContentUI";
import WritingList from "../components/WritingList";
import WritingKind from "../components/WritingKind";
import { writingEntries } from "../utils/localization.cjs";
import {
  writingKinds,
  writingKind,
  writingFilters,
  filterWriting,
} from "../utils/writing-kinds.cjs";
import { useText } from "../../apps/web/components/Shell";
import LabSketch from "../../apps/web/components/LabSketch";
import Link from "@lab/runtime/Link";

const defaultFilters = { kind: "all", domain: "all", type: "all" };
const descriptions = {
  all: [
    "从可运行的教程，到有出处的机制与工程拆解。",
    "Runnable tutorials, sourced mechanisms and engineering decisions.",
    "從可執行的教程，到有出處的機制與工程拆解。",
  ],
  tutorial: [
    "跟着请求、代码和真实记录，完成一次实践。",
    "Follow code, requests and recorded results through a working example.",
    "跟著請求、程式碼和真實記錄，完成一次實作。",
  ],
  "case-study": [
    "沿着真实项目，理解数据流、取舍与故障边界。",
    "Follow real projects through data flow, decisions and failure boundaries.",
    "沿著真實專案，理解資料流程、取捨與故障邊界。",
  ],
  mechanism: [
    "顺着一手资料和可核对的推导，把原理讲清楚。",
    "Work through primary sources and checkable derivations.",
    "順著一手資料和可核對的推導，把原理講清楚。",
  ],
  essay: [
    "记录重新开始、持续学习和构建的过程。",
    "Reflections on starting again, learning and building.",
    "記錄重新開始、持續學習和構建的過程。",
  ],
};

export default function Articles() {
  const { entries } = useContent();
  const t = useText();
  const writing = writingEntries(entries);
  const [filters, setFilters] = useState(defaultFilters);
  useEffect(() => {
    const sync = () => setFilters(writingFilters(location.search));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function updateFilters(next) {
    setFilters(next);
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(next)) {
      if (value === "all") url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.pushState(history.state, "", url);
  }
  const visible = filterWriting(writing, filters);
  const filtered = Object.values(filters).some((value) => value !== "all");
  const domains = [
    ["all", t("全部方向", "All tracks", "全部方向")],
    ["ai-apps", t("AI 应用开发", "AI Applications", "AI 應用開發")],
    ["llm", "LLM"],
    ["embodied-ai", t("具身智能", "Embodied AI", "具身智能")],
  ];
  return (
    <Layout
      title={t("文章", "Writing", "文章")}
      description={t(...descriptions.all)}
    >
      <main className="hh-page editorial-articles">
        <p className="hh-eyebrow">{t("文章", "Writing", "文章")}</p>
        <h1>
          {t(
            "把问题读懂，把方法带走。",
            "Understand the question. Take away a method.",
            "把問題讀懂，把方法帶走。",
          )}
        </h1>
        <p className="hh-lead">{t(...descriptions.all)}</p>
        <div className="writing-filters">
          <div
            className="hh-controls"
            role="group"
            aria-label={t(
              "按阅读目的筛选",
              "Filter by reading purpose",
              "依閱讀目的篩選",
            )}
          >
            {["all", ...Object.keys(writingKinds)]
              .filter(
                (kind) =>
                  kind === "all" ||
                  kind === filters.kind ||
                  writing.some((e) => writingKind(e) === kind),
              )
              .map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={filters.kind === kind}
                  onClick={() =>
                    updateFilters({ ...filters, kind, type: "all" })
                  }
                >
                  {kind === "all"
                    ? t("全部内容", "All writing", "全部內容")
                    : t(...writingKinds[kind])}
                  <span className="filter-count">
                    {filterWriting(writing, { kind }).length}
                  </span>
                </button>
              ))}
          </div>
          <div
            className="hh-controls writing-domain-filters"
            role="group"
            aria-label={t(
              "按研究方向筛选",
              "Filter by research track",
              "依研究方向篩選",
            )}
          >
            {domains.map(([domain, label]) => (
              <button
                key={domain}
                type="button"
                data-domain={domain}
                aria-pressed={filters.domain === domain}
                onClick={() => updateFilters({ ...filters, domain })}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="writing-filter-summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              {visible.length} {t("篇", "entries", "篇")} ·{" "}
              {t(...(descriptions[filters.kind] || descriptions.all))}
            </p>
            {filtered && (
              <button
                type="button"
                onClick={() => updateFilters(defaultFilters)}
              >
                {t("清除筛选", "Clear filters", "清除篩選")}
              </button>
            )}
          </div>
        </div>
        {!filtered && visible[0] && (
          <article
            className="article-spotlight"
            data-domain={visible[0].domain}
          >
            <div>
              <p className="eyebrow">
                {t("最近更新", "Latest writing", "最近更新")} /{" "}
                <WritingKind entry={visible[0]} />
              </p>
              <h2>
                <Link to={visible[0].href}>{visible[0].title}</Link>
              </h2>
              <p>{visible[0].description}</p>
              <div className="spotlight-meta">
                <time dateTime={visible[0].date}>{visible[0].date}</time>
                {visible[0].minutes && (
                  <span>
                    {visible[0].minutes} {t("分钟阅读", "min read", "分鐘閱讀")}
                  </span>
                )}
              </div>
              <Link className="featured-action" to={visible[0].href}>
                <span>{t("开始阅读", "Start reading", "開始閱讀")}</span>
                <span className="action-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
            <div className="article-sketch" aria-hidden="true">
              <LabSketch
                kind={
                  visible[0].domain === "llm"
                    ? "model"
                    : visible[0].domain === "embodied-ai"
                      ? "embodied"
                      : "application"
                }
              />
            </div>
          </article>
        )}
        {(!visible.length || filtered || visible.length > 1) && (
          <WritingList items={filtered ? visible : visible.slice(1)} />
        )}
      </main>
    </Layout>
  );
}
