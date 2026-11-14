"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";
import Link from "../runtime/Link";
import UrlStateSync from "./UrlStateSync";
import logs from "@site/data/build-log.json";
import articleHistory from "@site/data/article-history.json";
import current from "@site/data/current.json";
import {
  buildChangelog,
  changelogDefaults,
  changelogFilterUrl,
  changelogMonths,
  changelogRepository,
  filterChangelog,
  readChangelogFilters,
} from "../lib/changelog-data";
import type {
  ArticleHistoryRecord,
  ChangelogCategory,
  ChangelogCodeRecord,
  ChangelogFilters,
  ChangelogRecord,
} from "../lib/changelog-data";
import styles from "./changelog-timeline.module.css";

const categories: ChangelogCategory[] = ["all", "site", "content", "release"];
const modules: Record<string, [string, string, string]> = {
  site: ["全站", "Site", "全站"],
  home: ["首页", "Home", "首頁"],
  navigation: ["导航", "Navigation", "導覽"],
  learning: ["学习", "Learn", "學習"],
  reading: ["阅读", "Reading", "閱讀"],
  articles: ["文章", "Writing", "文章"],
  knowledge: ["知识", "Knowledge", "知識"],
  build: ["项目与实验", "Projects & labs", "專案與實驗"],
  radar: ["AI 雷达", "AI Radar", "AI 雷達"],
};
function ChangeRow({ record }: { record: ChangelogRecord }) {
  const t = useText();
  const kind =
    record.kind === "site"
      ? t("站点改进", "Site improvement", "網站改進")
      : record.kind === "publication"
        ? t("内容新增", "New content", "內容新增")
        : t("内容修订", "Content revision", "內容修訂");
  const explanation =
    record.dateSource === "commit"
      ? t(
          "日期来自代码提交，不代表部署时间。",
          "The date comes from the code commit, not a deployment.",
          "日期來自程式碼提交，不代表部署時間。",
        )
      : record.dateSource === "publication"
        ? t(
            "日期来自内容索引的首次发表字段，不代表站点部署时间。",
            "The original publication date comes from the content index, not a site deployment.",
            "日期來自內容索引的首次發表欄位，不代表網站部署時間。",
          )
        : t(
            "日期来自有提交依据的修订记录，不由页面更新时间推测。",
            "The date comes from an attributed revision record, not an inferred page-update date.",
            "日期來自有提交依據的修訂記錄，不由頁面更新時間推測。",
          );
  return (
    <li
      className="changelog-row"
      data-category={record.category}
      data-kind={record.kind}
      data-preview={record.preview || undefined}
    >
      <time
        className="changelog-date"
        dateTime={record.timestamp || record.date}
      >
        <span>{record.date.slice(5).replace("-", ".")}</span>
        <small>{record.date.slice(0, 4)}</small>
      </time>
      <article className="changelog-entry">
        <div className="changelog-entry-meta">
          <span className="changelog-kind">{kind}</span>
          {record.preview && (
            <span className="changelog-branch-label">
              {t("开发分支记录", "Development branch", "開發分支記錄")}
            </span>
          )}
        </div>
        <h3>
          {record.href ? (
            <Link to={record.href}>{record.title}</Link>
          ) : (
            record.title
          )}
        </h3>
        {record.summary && (
          <p className="changelog-summary">{record.summary}</p>
        )}
        <p className="changelog-modules">
          <span>{t("影响模块", "Touches", "影響模組")}</span>
          {record.modules
            .map((module) => (modules[module] ? t(...modules[module]) : module))
            .join(" · ")}
        </p>
        <details className="changelog-evidence">
          <summary>
            {t("查看记录依据", "Inspect the record", "查看記錄依據")}
            {record.commits[0] && <code>{record.commits[0].slice(0, 7)}</code>}
          </summary>
          <div className="changelog-evidence-body">
            <p>{explanation}</p>
            <dl>
              <div>
                <dt>{t("记录日期", "Recorded date", "記錄日期")}</dt>
                <dd>
                  <time dateTime={record.timestamp || record.date}>
                    {record.timestamp || record.date}
                  </time>
                </dd>
              </div>
              {record.contentId && (
                <div>
                  <dt>{t("内容 ID", "Content ID", "內容 ID")}</dt>
                  <dd>
                    <code>{record.contentId}</code>
                  </dd>
                </div>
              )}
              {record.originalTitle && (
                <div>
                  <dt>
                    {t(
                      "原始提交说明",
                      "Original commit message",
                      "原始提交說明",
                    )}
                  </dt>
                  <dd>{record.originalTitle}</dd>
                </div>
              )}
              {record.branch && (
                <div>
                  <dt>{t("开发分支", "Development branch", "開發分支")}</dt>
                  <dd>
                    <code>{record.branch}</code>
                  </dd>
                </div>
              )}
            </dl>
            <div className="changelog-source-links">
              {record.href && (
                <Link to={record.href}>
                  {t("阅读内容", "Read the content", "閱讀內容")} →
                </Link>
              )}
              {record.commits.map((commit) => (
                <a
                  key={commit}
                  href={changelogRepository + "/commit/" + commit}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("代码依据", "Code evidence", "程式碼依據")}{" "}
                  {commit.slice(0, 7)} ↗
                </a>
              ))}
            </div>
          </div>
        </details>
      </article>
    </li>
  );
}

export default function ChangelogTimeline({
  includePreview = false,
}: {
  includePreview?: boolean;
}) {
  const t = useText();
  const { locale, globalData } = useSite();
  const entries = globalData["content-index"].entries;
  const records = useMemo(
    () =>
      buildChangelog({
        entries,
        codeRecords: logs as ChangelogCodeRecord[],
        articleHistory: articleHistory as Record<
          string,
          ArticleHistoryRecord[]
        >,
        locale,
        includePreview,
      }),
    [entries, locale, includePreview],
  );
  const months = useMemo(() => changelogMonths(records), [records]);
  const [filters, setFilters] = useState<ChangelogFilters>(changelogDefaults);
  const searchInput = useRef<HTMLInputElement>(null);
  const sync = useCallback(
    () => setFilters(readChangelogFilters(location.search, months)),
    [months],
  );
  const visible = filterChangelog(records, filters);
  const active =
    filters.category !== "all" || filters.month !== "all" || !!filters.q.trim();
  const labels: Record<ChangelogCategory, string> = {
    all: t("全部", "All", "全部"),
    site: t("站点改进", "Site improvements", "網站改進"),
    content: t("内容修订", "Content changes", "內容修訂"),
    release: t("正式发布", "Releases", "正式發佈"),
  };
  function update(next: ChangelogFilters, replace = false) {
    setFilters(next);
    const url = changelogFilterUrl(location.href, next);
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
  }
  return (
    <main className={styles.page + " hh-page changelog-page"}>
      <UrlStateSync onChange={sync} />
      <header className="changelog-heading atlas-page-heading">
        <p className="lab-page-label">
          {t("更新 / 站点演进", "UPDATES / SITE EVOLUTION", "更新 / 網站演進")}
        </p>
        <h1>{t("站点演进", "Site evolution", "網站演進")}</h1>
        <p>
          {t(
            "内容与体验的变化，保留可追溯的记录。",
            "A traceable record of changes to the content and reading experience.",
            "內容與體驗的變化，保留可追溯的記錄。",
          )}
        </p>
      </header>
      <section
        className="changelog-toolbar"
        aria-label={t("筛选站点演进", "Filter site evolution", "篩選網站演進")}
      >
        <div
          className="changelog-categories"
          role="group"
          aria-label={t("记录类别", "Record category", "記錄類別")}
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={filters.category === category}
              onClick={() => update({ ...filters, category })}
            >
              {labels[category]}
            </button>
          ))}
        </div>
        <div className="changelog-search">
          <label htmlFor="changelog-query">
            {t("搜索更新内容", "Search changes", "搜尋更新內容")}
          </label>
          <input
            ref={searchInput}
            id="changelog-query"
            type="search"
            value={filters.q}
            onChange={(event) =>
              update({ ...filters, q: event.target.value }, true)
            }
            placeholder={t(
              "标题、摘要或提交编号",
              "Title, summary or commit",
              "標題、摘要或提交編號",
            )}
          />
        </div>
        <div className="changelog-month-filter">
          <label htmlFor="changelog-month">
            {t("按月份", "Month", "依月份")}
          </label>
          <select
            id="changelog-month"
            value={filters.month}
            onChange={(event) =>
              update({ ...filters, month: event.target.value })
            }
          >
            <option value="all">
              {t("全部月份", "All months", "全部月份")}
            </option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month.replace("-", " / ")}
              </option>
            ))}
          </select>
        </div>
      </section>
      <div className="changelog-result-bar">
        <p role="status" aria-live="polite">
          {visible.length} {t("条记录", "records", "筆記錄")}
          {active && " · " + t("已应用筛选", "Filtered", "已套用篩選")}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => {
              update(changelogDefaults);
              searchInput.current?.focus();
            }}
          >
            {t("清除条件", "Clear filters", "清除條件")}
          </button>
        )}
      </div>
      <p className="changelog-date-note">
        {t(
          "提交、内容发表与部署是不同事件；提交记录不等同于生产发布。",
          "Commits, content publication and deployments are different events. A commit is not a production release.",
          "提交、內容發表與部署是不同事件；提交記錄不等同於正式發佈。",
        )}
      </p>
      <div className="changelog-layout">
        <div className="changelog-main">
          {includePreview && records.some((record) => record.preview) && (
            <aside className="changelog-preview">
              <span className="changelog-preview-label">
                {t(
                  "开发分支 / 本地预览",
                  "DEVELOPMENT BRANCH / PREVIEW",
                  "開發分支 / 本機預覽",
                )}
              </span>
              <h2>
                {t(
                  "改版过程，单独记录。",
                  "Work in progress, clearly marked.",
                  "改版過程，獨立記錄。",
                )}
              </h2>
              <p>
                {t(
                  "标注为开发分支的条目说明改版过程，不表示已合入主干或已经上线。",
                  "Development-branch entries document the redesign. They do not imply a merge to main or a production deployment.",
                  "標示為開發分支的條目說明改版過程，不表示已合入主幹或已經上線。",
                )}
              </p>
            </aside>
          )}
          {visible.length ? (
            changelogMonths(visible).map((month) => (
              <section
                className="changelog-month"
                key={month}
                aria-labelledby={"changelog-month-" + month}
              >
                <header className="changelog-month-heading">
                  <h2 id={"changelog-month-" + month}>
                    {month.replace("-", " / ")}
                  </h2>
                  <span>
                    {t(
                      "日期依据见各条记录",
                      "Date sources are listed per record",
                      "日期依據見各筆記錄",
                    )}
                  </span>
                </header>
                <ol>
                  {visible
                    .filter((record) => record.date.startsWith(month))
                    .map((record) => (
                      <ChangeRow key={record.id} record={record} />
                    ))}
                </ol>
              </section>
            ))
          ) : (
            <section className="changelog-empty">
              <h2>
                {filters.category === "release"
                  ? t(
                      "暂无已核实的正式发布",
                      "No verified release records",
                      "暫無已核實的正式發佈",
                    )
                  : t(
                      "没有匹配的记录",
                      "No matching records",
                      "沒有符合的記錄",
                    )}
              </h2>
              <p>
                {filters.category === "release"
                  ? t(
                      "目前没有可核实的部署记录，代码提交与内容发表不会自动算作上线。",
                      "There is no verified deployment record. Commits and content dates are not automatically counted as releases.",
                      "目前沒有可核實的部署記錄，程式碼提交與內容發表不會自動算作上線。",
                    )
                  : t(
                      "试试其他关键词、月份或类别，也可以清除筛选。",
                      "Try another keyword, month or category, or clear the filters.",
                      "試試其他關鍵字、月份或類別，也可以清除篩選。",
                    )}
              </p>
            </section>
          )}
        </div>
        <aside
          className="changelog-sidebar"
          aria-label={t("关于这些记录", "About these records", "關於這些記錄")}
        >
          <section>
            <h2>{t("这里记录什么", "What belongs here", "這裡記錄什麼")}</h2>
            <dl className="changelog-explainer">
              <div>
                <dt>
                  {t("内容发布与修订", "Content & revisions", "內容發表與修訂")}
                </dt>
                <dd>
                  {t(
                    "首次发表日期来自内容索引；后续修订保留明确摘要与提交依据。",
                    "Original dates follow the content index; later revisions carry a summary and commit evidence.",
                    "首次發表日期來自內容索引；後續修訂保留明確摘要與提交依據。",
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  {t(
                    "可追溯的站点改进",
                    "Traceable site improvements",
                    "可追溯的網站改進",
                  )}
                </dt>
                <dd>
                  {t(
                    "说明功能、结构或阅读体验改了什么，并保留代码记录。",
                    "Changes to features, structure or reading, with the underlying code record.",
                    "說明功能、結構或閱讀體驗改了什麼，並保留程式碼記錄。",
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  {t(
                    "有凭据的正式发布",
                    "Evidence-based releases",
                    "有憑據的正式發佈",
                  )}
                </dt>
                <dd>
                  {t(
                    "只有核实部署后才记录发布；不以项目状态或提交日期代替。",
                    "A release requires verified deployment evidence, not a project label or commit date.",
                    "只有核實部署後才記錄發佈；不以專案狀態或提交日期代替。",
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <section className="changelog-release-empty">
            <h2>{t("正式发布", "Releases", "正式發佈")}</h2>
            <p>
              {t(
                "暂无已核实的部署记录。",
                "No verified deployment records yet.",
                "暫無已核實的部署記錄。",
              )}
            </p>
          </section>
          <section>
            <h2>{t("相关链接", "Related", "相關連結")}</h2>
            <nav
              className="changelog-related"
              aria-label={t("学习与近况", "Learning and now", "學習與近況")}
            >
              <Link to="/timeline">
                {t("学习时间轴", "Learning timeline", "學習時間軸")} →
              </Link>
              <Link to="/now">{t("当前关注", "Now", "目前關注")} →</Link>
            </nav>
            <p className="changelog-maintenance-note">
              {t(
                "近况为人工快照，实际更新于",
                "Now is a manual snapshot, last updated",
                "近況為人工快照，實際更新於",
              )}{" "}
              <time dateTime={current.updated}>{current.updated}</time>
            </p>
          </section>
          <section className="changelog-maintenance">
            <h2>
              {t("记录如何维护", "How records stay current", "記錄如何維護")}
            </h2>
            <p>
              {t(
                "内容新增随站点构建更新；代码改进与修订摘要按实际来源维护。这里不实时抓取，也不收录单条外部 Radar 信号。",
                "New content follows each site build. Code changes and revision summaries are maintained from their sources. This page does not fetch live data or include individual external Radar signals.",
                "內容新增隨網站構建更新；程式碼改進與修訂摘要依實際來源維護。這裡不即時抓取，也不收錄單條外部 Radar 訊號。",
              )}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
