import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContentData } from "@lab/runtime/data";
import tracks from "@site/data/learning-paths.json";
import useLearningProgress from "../components/useLearningProgress";
import { useText } from "@lab/components/Shell";
import { learningSymbols } from "@site/src/utils/learning-progress.ts";
import SeriesEntry from "../components/SeriesEntry";
import {
  nextReadingStep,
  readLearningFilters,
  learningFilterUrl,
  readingGroups,
} from "@lab/lib/reading-paths.mjs";

export default function Learning() {
  const t = useText();
  const label = (key) =>
    ({
      BUILD: t("构建", "Build", "構建"),
      UNDERSTAND: t("理解", "Understand", "理解"),
      EXPLORE: t("探索", "Explore", "探索"),
      RETRIEVE: t("检索", "Retrieve", "檢索"),
      beginner: t("入门", "Beginner", "入門"),
      intermediate: t("进阶", "Intermediate", "進階"),
      advanced: t("深入", "Advanced", "深入"),
      MIN: t("分钟", "min", "分鐘"),
      LAB: t("实验", "Lab", "實驗"),
      PROJECT: t("项目", "Project", "專案"),
    })[key] || key;

  const { entries } = useContentData("learning-index");
  const content = useContentData("content-index").entries;
  const progress = useLearningProgress();
  const [filters, setFilters] = useState(() => readLearningFilters());
  const { query, saved, difficulty } = filters;
  const [target, setTarget] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  useEffect(() => {
    const sync = () => {
      setTarget(location.hash.slice(1));
      setFilters(readLearningFilters(location.search));
      setSuggestion(null);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  useEffect(() => {
    // A hash can point inside a previously collapsed reading path.
    // Scroll only after React has opened it, never on ordinary filter updates.
    if (!target) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [target]);
  const available = new Map(entries.map((e) => [e.stepId, e]));
  const resume = available.get(progress.lastOpened);
  const matches = (step) => {
    const article = available.get(step.id);
    return (
      (!saved || progress.saved.includes(step.id)) &&
      (difficulty === "all" ||
        (article?.difficulty || step.difficulty) === difficulty) &&
      [
        article?.title,
        article?.description,
        step.title,
        step.en,
        step.outcome,
        step.outcomeEn,
        step.outcomeTw,
        ...Object.values(step.plan || {}).flat(),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  };
  const candidates = tracks
    .flatMap((track) => track.steps)
    .filter((step) => available.has(step.id) && matches(step));
  const filtered = !!query.trim() || saved || difficulty !== "all";
  const visibleTracks = tracks
    .map((track) => ({
      track,
      ...readingGroups(track, available, matches),
    }))
    .filter(
      ({ chapters, studies, plans }) =>
        chapters.length || studies.length || plans.length,
    );
  const plannedCount = visibleTracks.reduce(
    (count, group) => count + group.plans.length,
    0,
  );
  const title = (step) =>
    available.get(step.id)?.title ||
    t(step.title, step.en, step.titleTw || step.title);
  const updateFilters = (next, replace = false) => {
    const value = { ...filters, ...next };
    setFilters(value);
    setSuggestion(null);
    setTarget("");
    const url = learningFilterUrl(location.href, value);
    if (url !== location.pathname + location.search + location.hash) {
      history[replace ? "replaceState" : "pushState"](history.state, "", url);
    }
  };
  const reset = () => updateFilters(readLearningFilters());
  const render = (step, track, nested = false) => {
    const Heading = nested ? "h4" : "h3";
    const article = available.get(step.id);
    const prereqs = (article?.prerequisites || [])
      .map((id) => content.find((e) => e.id === id))
      .filter(Boolean);
    const related = (article?.related || [])
      .map((id) => content.find((e) => e.id === id))
      .filter((e) => e && ["lab", "project"].includes(e.type));
    const next = nextReadingStep(track, step.id, available);
    return (
      <li
        id={"step-" + step.id}
        key={step.id}
        className={article ? "hh-step" : "hh-planned"}
      >
        <p className="hh-eyebrow">
          {label(track.brand)} ·{" "}
          {article
            ? label(article.difficulty)
            : t("计划选题", "Planned topic", "計畫選題")}
        </p>
        <Heading>
          {article ? (
            <Link
              to={article.permalink}
              onClick={() =>
                progress.items[step.id]?.status !== "completed" &&
                progress.update(step.id, "reading")
              }
            >
              {title(step)} →
            </Link>
          ) : (
            title(step)
          )}
        </Heading>
        {article && (
          <>
            <p>
              {t("读后能做什么：", "After reading: ", "讀後能做什麼：")}
              {t(step.outcome, step.outcomeEn, step.outcomeTw)}
            </p>
            <details className="step-resources">
              <summary>
                {t(
                  "先修与配套代码",
                  "Prerequisites and code",
                  "先修與配套程式碼",
                )}
              </summary>
              <p className="hh-meta">
                {t("先修：", "Prerequisites: ", "先修：")}
                {prereqs.length
                  ? prereqs.map((e, i) => (
                      <React.Fragment key={e.id}>
                        {i > 0 && " · "}
                        <Link to={e.href}>{e.title}</Link>
                      </React.Fragment>
                    ))
                  : t(...track.background)}
              </p>
              <div className="series-entry">
                {related.map((e) => (
                  <Link key={e.id} to={e.href}>
                    {label(e.type.toUpperCase())} · {e.title} →
                  </Link>
                ))}
              </div>
            </details>
            {next && (
              <p className="hh-meta">
                {t("下一步：", "Next: ", "下一步：")}
                <Link to={available.get(next.id).permalink}>
                  {title(next)} →
                </Link>
              </p>
            )}
            {!next && (
              <p>
                <Link to={"/articles?domain=" + track.domain}>
                  {t(
                    "继续选读本方向已发表文章",
                    "Explore more published articles in this track",
                    "繼續選讀本方向已發表文章",
                  )}{" "}
                  →
                </Link>
              </p>
            )}
          </>
        )}
        {!article && step.plan && (
          <>
            <p>{t(step.outcome, step.outcomeEn, step.outcomeTw)}</p>
            <dl className="research-plan">
              {[
                ["before", t("先修知识", "Prerequisites", "先修知識")],
                ["question", t("研究问题", "Research question", "研究問題")],
                [
                  "deliverable",
                  t("计划产物", "Planned deliverables", "計畫產物"),
                ],
                ["validation", t("如何验证", "How to validate", "如何驗證")],
              ].map(([key, heading]) => (
                <React.Fragment key={key}>
                  <dt>{heading}</dt>
                  <dd>{t(...step.plan[key])}</dd>
                </React.Fragment>
              ))}
            </dl>
            {step.previousStep && (
              <p className="hh-meta">
                <a href={"#step-" + step.previousStep}>
                  {t("回到前一步", "Previous step", "回到前一步")} ↑
                </a>
                {track.steps[track.steps.indexOf(step) + 1] && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={
                        "#step-" + track.steps[track.steps.indexOf(step) + 1].id
                      }
                    >
                      {t("下一步", "Next step", "下一步")} →
                    </a>
                  </>
                )}
              </p>
            )}
          </>
        )}
        <div className="learning-actions">
          {article && (
            <>
              <span className="hh-meta">
                {article.minutes} {label("MIN")}
              </span>
              <button
                type="button"
                disabled={!progress.ready}
                aria-pressed={progress.items[step.id]?.status === "completed"}
                onClick={() =>
                  progress.update(
                    step.id,
                    progress.items[step.id]?.status === "completed"
                      ? "reading"
                      : "completed",
                  )
                }
              >
                {
                  learningSymbols[
                    progress.items[step.id]?.status || "not-started"
                  ]
                }{" "}
                {progress.items[step.id]?.status === "completed"
                  ? t("已完成", "Completed", "已完成")
                  : t("标记完成", "Mark complete", "標記完成")}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={!progress.ready}
            aria-pressed={progress.saved.includes(step.id)}
            onClick={() => progress.update(step.id, "saved")}
          >
            ☆{" "}
            {progress.saved.includes(step.id)
              ? t("已收藏", "Saved", "已收藏")
              : t("想读", "Save", "想讀")}
          </button>
        </div>
      </li>
    );
  };
  return (
    <Layout
      title={t("学习路线", "Learning paths", "學習路線")}
      description={t(
        "按先修知识与真实成果选择阅读顺序。",
        "Choose a reading order through prerequisites and recorded results.",
        "依先修知識與真實成果選擇閱讀順序。",
      )}
    >
      <main className="hh-page learning-page">
        <p className="hh-eyebrow">{t("学习", "Learning", "學習")}</p>
        <h1>
          {t(
            "沿着问题，一步步读懂。",
            "Follow the questions, one step at a time.",
            "沿著問題，一步步讀懂。",
          )}
        </h1>
        <p>
          {t(
            "先沿主线建立整体认识，遇到具体问题再读专题。主线是阅读建议；运行实验前仍请核对每篇的先修与固定代码版本。",
            "Start with the core path, then choose a focused study. This is a reading guide; check each article’s prerequisites and pinned revision before running its experiment.",
            "先沿主線建立整體認識，遇到具體問題再讀專題。主線是閱讀建議；執行實驗前仍請核對每篇的先修與固定程式碼版本。",
          )}
        </p>
        <p className="hh-meta">
          {
            entries.filter(
              (e) => progress.items[e.stepId]?.status === "completed",
            ).length
          }{" "}
          / {entries.length} ·{" "}
          {t(
            "全部文章的阅读进度，仅保存在当前浏览器。",
            "Progress across all articles, stored in this browser only.",
            "全部文章的閱讀進度，僅儲存在目前瀏覽器。",
          )}
        </p>
        {resume ? (
          <p>
            {t("继续阅读：", "Continue reading: ", "繼續閱讀：")}
            <Link to={resume.permalink}>{resume.title} →</Link>
          </p>
        ) : (
          <p>
            {t(
              "从下面选一条路线开始。",
              "Choose your first path below.",
              "從下方選一條路線開始。",
            )}
          </p>
        )}
        {progress.error && (
          <p role="status">
            {t(
              "浏览器存储不可用，进度仅在本次访问保留。",
              "Storage is unavailable; progress lasts for this visit only.",
              "瀏覽器儲存不可用，進度僅於本次造訪保留。",
            )}
          </p>
        )}
        <nav
          className="learning-track-nav"
          aria-label={t(
            "选择学习方向",
            "Choose a learning track",
            "選擇學習方向",
          )}
        >
          {visibleTracks.map(({ track }) => (
            <a key={track.id} href={"#track-" + track.domain}>
              {t(track.title, track.en, track.titleTw)}
            </a>
          ))}
        </nav>
        <div className="hh-controls">
          <label>
            {t("查找选题", "Find a topic", "查找選題")}
            <input
              type="search"
              value={query}
              onChange={(e) => updateFilters({ query: e.target.value }, true)}
            />
          </label>
          <label>
            {t("难度", "Difficulty", "難度")}
            <select
              value={difficulty}
              onChange={(e) => updateFilters({ difficulty: e.target.value })}
            >
              {["all", "beginner", "intermediate", "advanced"].map((v) => (
                <option key={v} value={v}>
                  {v === "all"
                    ? t("全部难度", "All levels", "全部難度")
                    : label(v)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-pressed={saved}
            disabled={!progress.ready}
            onClick={() => updateFilters({ saved: !saved })}
          >
            ☆ {t("只看想读", "Saved only", "只看想讀")}
          </button>
          <button
            type="button"
            disabled={!candidates.length}
            onClick={() =>
              setSuggestion(
                candidates[Math.floor(Math.random() * candidates.length)],
              )
            }
          >
            {t(
              "随机探索已发布内容",
              "Explore a published article",
              "隨機探索已發布內容",
            )}
          </button>
          <button type="button" onClick={reset}>
            {t("清除筛选", "Clear filters", "清除篩選")}
          </button>
        </div>
        {suggestion && (
          <p role="status">
            <a href={"#step-" + suggestion.id}>{title(suggestion)} →</a>
          </p>
        )}
        {filtered && visibleTracks.length > 0 && (
          <p role="status">
            {t(
              `${candidates.length} 篇已发表文章 · ${plannedCount} 项未发表计划`,
              `${candidates.length} published ${candidates.length === 1 ? "article" : "articles"} · ${plannedCount} unpublished ${plannedCount === 1 ? "plan" : "plans"}`,
              `${candidates.length} 篇已發表文章 · ${plannedCount} 項未發表計畫`,
            )}
          </p>
        )}
        {!visibleTracks.length && (
          <p role="status" className="hh-empty">
            {t(
              "没有符合这些筛选条件的选题。清除筛选后可查看完整路线。",
              "No topics match these filters. Clear them to see the full paths.",
              "沒有符合這些篩選條件的選題。清除篩選後可查看完整路線。",
            )}
          </p>
        )}
        {visibleTracks.map(({ track, chapters, studies, plans }) => (
          <section
            key={track.id}
            id={"track-" + track.domain}
            className="hh-section learning-track"
            data-domain={track.domain}
          >
            <h2>
              {label(track.brand)} / {t(track.title, track.en, track.titleTw)}
            </h2>
            <p>{t(...track.background)}</p>
            {track.boundary && (
              <p className="topic-boundary">{t(...track.boundary)}</p>
            )}
            <SeriesEntry domain={track.domain} />
            <div className="learning-chapters">
              {chapters.map((chapter) => {
                return (
                  <section className="learning-chapter" key={chapter.title[1]}>
                    <header>
                      <p className="hh-eyebrow">
                        0{chapter.index + 1} / {t("主线", "Core path", "主線")}
                      </p>
                      <h3>{t(...chapter.title)}</h3>
                      <p>{t(...chapter.goal)}</p>
                    </header>
                    <ol className="hh-roadmap">
                      {chapter.steps.map((step) => render(step, track, true))}
                    </ol>
                  </section>
                );
              })}
            </div>
            {studies.length > 0 && (
              <details
                open={
                  studies.some((s) => target === "step-" + s.id) || filtered
                }
              >
                <summary>
                  {t(
                    "专题选读 · 按问题深入",
                    "Focused studies · explore a question",
                    "專題選讀 · 依問題深入",
                  )}{" "}
                  · {studies.length}
                </summary>
                <ol className="hh-roadmap">
                  {studies.map((s) => render(s, track))}
                </ol>
              </details>
            )}
            {plans.length > 0 && (
              <details
                id={"plans-" + track.domain}
                open={
                  target === "plans-" + track.domain ||
                  plans.some((s) => target === "step-" + s.id) ||
                  filtered
                }
              >
                <summary>
                  {t(
                    "后续计划 · 尚未发表",
                    "Future topics · unpublished",
                    "後續計畫 · 尚未發表",
                  )}{" "}
                  · {plans.length}
                </summary>
                <ol className="hh-roadmap">
                  {plans.map((s) => render(s, track))}
                </ol>
              </details>
            )}
          </section>
        ))}
        {!filtered && (
          <section className="hh-section" id="engineering">
            <h2>
              {t(
                "遇到工程问题，从这里查",
                "Find an engineering answer",
                "遇到工程問題，從這裡查",
              )}
            </h2>
            <p>
              {t(
                "已有实践：请求超时、失败重试与可靠投递。",
                "Published studies on deadlines, retries and reliable delivery.",
                "已有實作：請求逾時、失敗重試與可靠投遞。",
              )}
            </p>
            <ul className="engineering-reading">
              {[
                "java-retry-deadline",
                "java-idempotent-retry",
                "java-outbox-delivery",
              ]
                .map((id) => available.get(id))
                .filter(Boolean)
                .map((entry) => (
                  <li key={entry.stepId}>
                    <Link to={entry.permalink}>{entry.title} →</Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
        <p>
          <Link to="/reading">{t("阅读清单", "Reading list", "閱讀清單")}</Link>{" "}
          ·{" "}
          <Link to="/journey">
            {t(
              "作者的长期研究计划",
              "The author’s research plan",
              "作者的長期研究計畫",
            )}
          </Link>{" "}
          · <Link to="/build">{t("动手实践", "Build", "動手實作")}</Link>
        </p>
      </main>
    </Layout>
  );
}
