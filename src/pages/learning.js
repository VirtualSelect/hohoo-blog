import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContentData } from "@lab/runtime/data";
import tracks from "@site/data/learning-paths.json";
import useLearningProgress from "../components/useLearningProgress";
import { useText } from "@lab/components/Shell";
import LearningLaunchpad from "@lab/components/LearningLaunchpad";
import LearningStep from "@lab/components/LearningStep";
import useResearchTrack from "@lab/components/useResearchTrack";
import {
  coreSteps,
  readLearningFilters,
  learningFilterUrl,
  matchesReadingQuery,
} from "@lab/lib/reading-paths.mjs";

export default function Learning() {
  const t = useText();
  const { entries } = useContentData("learning-index");
  const content = useContentData("content-index").entries;
  const progress = useLearningProgress();
  const [domain, chooseDomain] = useResearchTrack("all", true);
  const [filters, setFilters] = useState(() => readLearningFilters());
  const [target, setTarget] = useState("");
  const [view, setView] = useState("route");
  useEffect(() => {
    const sync = () => {
      setFilters(readLearningFilters(location.search));
      setTarget(location.hash.slice(1));
      setView(
        new URLSearchParams(location.search).get("view") === "questions"
          ? "questions"
          : "route",
      );
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  useEffect(() => {
    if (!target) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [target, domain]);
  const available = new Map(entries.map((entry) => [entry.stepId, entry]));
  const track = tracks.find((track) => track.domain === domain);
  const resume = available.get(progress.lastOpened);
  const { query, saved, difficulty } = filters;
  const filtering = !!query.trim() || saved || difficulty !== "all";
  const results = tracks
    .filter((track) => domain === "all" || track.domain === domain)
    .flatMap((track) =>
      track.steps.map((step) => ({
        step,
        track,
        article: available.get(step.id),
      })),
    )
    .filter(
      ({ step, article }) =>
        article &&
        (!saved || progress.saved.includes(step.id)) &&
        (difficulty === "all" ||
          (article.difficulty || step.difficulty) === difficulty) &&
        matchesReadingQuery(
          query,
          article.title,
          article.description,
          step.outcome,
          step.outcomeEn,
          step.outcomeTw,
        ),
    );
  const core = track
    ? coreSteps(track).filter((step) => available.has(step.id))
    : [];
  const questions = (track?.entryQuestions || [])
    .map((item) => ({
      ...item,
      step: track.steps.find((step) => step.id === item.step),
    }))
    .filter((item) => item.step && available.has(item.step.id));
  const coreTarget = core.some((step) => target === "step-" + step.id);
  const currentView = coreTarget ? "route" : view;
  const primary =
    currentView === "route" ? core : questions.map((item) => item.step);
  const primaryIds = new Set(primary.map((step) => step.id));
  const more = (track?.steps || []).filter(
    (step) => available.has(step.id) && !primaryIds.has(step.id),
  );
  const plans = (track?.steps || []).filter((step) => !available.has(step.id));
  function choose(value) {
    chooseDomain(value);
    setTarget("");
  }
  function update(next) {
    const value = { ...filters, ...next };
    setFilters(value);
    setTarget("");
    history.replaceState(
      history.state,
      "",
      learningFilterUrl(location.href, value),
    );
  }
  function chooseView(value) {
    setView(value);
    setTarget("");
    const url = new URL(location.href);
    url.hash = "";
    if (value === "questions") url.searchParams.set("view", value);
    else url.searchParams.delete("view");
    history.pushState(history.state, "", url.pathname + url.search);
  }
  const row = (step, index, question, compact = false, owner = track) => (
    <LearningStep
      key={step.id}
      step={step}
      track={owner}
      article={available.get(step.id)}
      content={content}
      progress={progress}
      index={index}
      question={question}
      compact={compact}
    />
  );
  return (
    <Layout
      title={t("学习路线", "Learning paths", "學習路線")}
      description={t(
        "选一个方向，从第一篇开始；也可以直接查找具体问题。",
        "Choose a direction and a first article, or look up a specific question.",
        "選一個方向，從第一篇開始；也能直接查找具體問題。",
      )}
    >
      <main className="hh-page focused-learning">
        <header className="focused-heading">
          {track ? (
            <button className="reading-back" onClick={() => choose("all")}>
              ← {t("所有方向", "All directions", "所有方向")}
            </button>
          ) : (
            <p className="obs-kicker">{t("学习", "LEARN", "學習")}</p>
          )}
          <h1>
            {track
              ? t(track.title, track.en, track.titleTw)
              : t("想从哪里开始？", "Where will you start?", "想從哪裡開始？")}
          </h1>
          <p>
            {track ? (
              <>
                {t("先修：", "Prerequisites: ", "先修：")}
                {t(...track.background)}
              </>
            ) : (
              t(
                "选一个方向，或直接搜索你遇到的问题。",
                "Choose a direction, or search for the problem in front of you.",
                "選一個方向，或直接搜尋你遇到的問題。",
              )
            )}
          </p>
        </header>
        <div className="reading-search">
          <label htmlFor="learning-query">
            {t(
              "查找文章或问题",
              "Find an article or question",
              "查找文章或問題",
            )}
          </label>
          <input
            id="learning-query"
            type="search"
            value={query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder={
              domain === "all"
                ? t(
                    "例如：超时、KV Cache、抓取",
                    "Try: timeout, KV cache, grasp",
                    "例如：逾時、KV Cache、抓取",
                  )
                : t(
                    "在当前方向中查找",
                    "Search this direction",
                    "在目前方向中查找",
                  )
            }
          />
        </div>
        {resume && !filtering && (
          <p className="reading-resume">
            {t("接着读：", "Continue: ", "接著讀：")}
            <Link to={resume.permalink}>{resume.title} →</Link>
          </p>
        )}
        <details
          className="reading-options"
          open={saved || difficulty !== "all"}
        >
          <summary>
            {t(
              "更多筛选与阅读记录",
              "More filters and reading records",
              "更多篩選與閱讀紀錄",
            )}
          </summary>
          <div className="hh-controls">
            <label>
              {t("难度", "Level", "難度")}
              <select
                value={difficulty}
                onChange={(event) => update({ difficulty: event.target.value })}
              >
                {[
                  ["all", t("全部", "All", "全部")],
                  ["beginner", t("入门", "Beginner", "入門")],
                  ["intermediate", t("进阶", "Intermediate", "進階")],
                  ["advanced", t("深入", "Advanced", "深入")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={!progress.ready}
              aria-pressed={saved}
              onClick={() => update({ saved: !saved })}
            >
              {t("只看想读", "Saved only", "只看想讀")}
            </button>
            <button onClick={() => update(readLearningFilters())}>
              {t("清除筛选", "Clear filters", "清除篩選")}
            </button>
            <Link to="/reading">
              {t("打开阅读清单", "Open reading list", "開啟閱讀清單")} ↗
            </Link>
          </div>
          <p className="hh-meta">
            {t(
              "仅搜索已发表文章；阅读标记保存在当前浏览器。",
              "Search covers published articles. Reading records stay in this browser.",
              "僅搜尋已發表文章；閱讀標記儲存在目前瀏覽器。",
            )}
          </p>
          {progress.error && (
            <p role="status">
              {t(
                "浏览器存储不可用，标记仅本次有效。",
                "Storage is unavailable; records last for this visit.",
                "瀏覽器儲存不可用，標記僅本次有效。",
              )}
            </p>
          )}
        </details>
        <div id="learning-results">
          {filtering ? (
            <section className="reading-results">
              <header>
                <h2>
                  {results.length}{" "}
                  {t("篇匹配文章", "matching articles", "篇符合文章")}
                </h2>
                {domain !== "all" && (
                  <button onClick={() => choose("all")}>
                    {t("搜索全部方向", "Search all directions", "搜尋全部方向")}{" "}
                    →
                  </button>
                )}
              </header>
              {results.length ? (
                <ol>
                  {results.map(({ step, track }, index) =>
                    row(step, index, null, true, track),
                  )}
                </ol>
              ) : (
                <p role="status">
                  {t(
                    "没有匹配的已发表文章。试着换一个词，或清除筛选。",
                    "No published articles match. Try another phrase or clear the filters.",
                    "沒有符合的已發表文章。試著換一個詞，或清除篩選。",
                  )}
                </p>
              )}
            </section>
          ) : !track ? (
            <LearningLaunchpad entries={content} onChoose={choose} />
          ) : (
            <section className="focused-track" id={"track-" + track.domain}>
              <h2 className="sr-only">
                {currentView === "route"
                  ? t("阅读主线", "Core reading", "閱讀主線")
                  : t("具体问题", "Specific questions", "具體問題")}
              </h2>
              <div
                className="reading-views"
                role="group"
                aria-label={t("阅读方式", "Reading approach", "閱讀方式")}
              >
                <button
                  aria-pressed={currentView === "route"}
                  onClick={() => chooseView("route")}
                >
                  {t("按顺序学", "Follow the sequence", "依順序學")}
                </button>
                <button
                  aria-pressed={currentView === "questions"}
                  onClick={() => chooseView("questions")}
                >
                  {t("解决具体问题", "Solve a problem", "解決具體問題")}
                </button>
              </div>
              <ol className="reading-route">
                {primary.map((step, index) =>
                  row(
                    step,
                    index,
                    currentView === "questions"
                      ? t(
                          ...questions.find((item) => item.step.id === step.id)
                            .label,
                        )
                      : null,
                  ),
                )}
              </ol>
              {more.length > 0 && (
                <details
                  className="reading-more"
                  open={more.some((step) => target === "step-" + step.id)}
                >
                  <summary>
                    {t(
                      "更多已发表专题",
                      "More published studies",
                      "更多已發表專題",
                    )}{" "}
                    · {more.length}
                  </summary>
                  <ol>
                    {more.map((step, index) => row(step, index, null, true))}
                  </ol>
                </details>
              )}
              <details
                className="reading-plans"
                id={"plans-" + track.domain}
                open={
                  target === "plans-" + track.domain ||
                  plans.some((step) => target === "step-" + step.id)
                }
              >
                <summary>
                  {t(
                    "后续研究计划 · 尚未发表",
                    "Future research · unpublished",
                    "後續研究計畫 · 尚未發表",
                  )}
                </summary>
                {plans.map((step) => (
                  <div key={step.id} id={"step-" + step.id}>
                    <details open={target === "step-" + step.id}>
                      <summary>
                        {t(step.title, step.en, step.titleTw || step.title)}
                      </summary>
                      <p>{t(step.outcome, step.outcomeEn, step.outcomeTw)}</p>
                      {step.plan && (
                        <dl>
                          {[
                            ["before", t("先修", "Prerequisites", "先修")],
                            ["question", t("问题", "Question", "問題")],
                            [
                              "deliverable",
                              t("计划产物", "Planned output", "計畫產物"),
                            ],
                            [
                              "validation",
                              t("验证方法", "Validation", "驗證方法"),
                            ],
                          ].map(([key, label]) => (
                            <React.Fragment key={key}>
                              <dt>{label}</dt>
                              <dd>{t(...step.plan[key])}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      )}
                    </details>
                  </div>
                ))}
              </details>
              <p className="reading-track-end">
                <Link to={"/docs/" + track.domain}>
                  {t("专题总览", "Topic overview", "專題總覽")} ↗
                </Link>
                <Link to={"/articles?domain=" + track.domain}>
                  {t(
                    "查找本方向文章",
                    "Find articles in this direction",
                    "查找本方向文章",
                  )}{" "}
                  ↗
                </Link>
              </p>
            </section>
          )}
        </div>
        {target === "engineering" && (
          <section id="engineering">
            <h2>
              {t("Java 工程专题", "Java engineering studies", "Java 工程專題")}
            </h2>
            <ul>
              {[
                "java-retry-deadline",
                "java-idempotent-retry",
                "java-outbox-delivery",
              ]
                .map((id) => available.get(id))
                .filter(Boolean)
                .map((article) => (
                  <li key={article.stepId}>
                    <Link to={article.permalink}>{article.title} ↗</Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </main>
    </Layout>
  );
}
