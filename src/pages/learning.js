import React, { useEffect, useState } from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useContentData } from "@lab/runtime/data";
import tracks from "@site/data/learning-paths.json";
import useLearningProgress from "../components/useLearningProgress";
import { useText } from "@lab/components/Shell";
import { learningSymbols } from "@site/src/utils/learning-progress.ts";
import SeriesEntry from "../components/SeriesEntry";

export default function Learning() {
  const t = useText();
  const label = (key) =>
    ({
      BUILD: t("构建", "Build", "構建"),
      UNDERSTAND: t("理解", "Understand", "理解"),
      EXPLORE: t("探索", "Explore", "探索"),
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
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const [target, setTarget] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  useEffect(() => {
    const sync = () => setTarget(location.hash.slice(1));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
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
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  };
  const candidates = tracks
    .flatMap((track) => track.steps)
    .filter((step) => available.has(step.id) && matches(step));
  const title = (step) =>
    available.get(step.id)?.title ||
    t(step.title, step.en, step.titleTw || step.title);
  const reset = () => {
    setQuery("");
    setSaved(false);
    setDifficulty("all");
    setSuggestion(null);
  };
  const render = (step, track) => {
    const article = available.get(step.id);
    const prereqs = (article?.prerequisites || [])
      .map((id) => content.find((e) => e.id === id))
      .filter(Boolean);
    const related = (article?.related || [])
      .map((id) => content.find((e) => e.id === id))
      .filter((e) => e && ["lab", "project"].includes(e.type));
    const published = track.steps.filter((s) => available.has(s.id));
    const next = published[published.findIndex((s) => s.id === step.id) + 1];
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
        <h3>
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
        </h3>
        {article && (
          <>
            <p>
              {t("读后能做什么：", "After reading: ", "讀後能做什麼：")}
              {t(step.outcome, step.outcomeEn, step.outcomeTw)}
            </p>
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
            {next && (
              <p className="hh-meta">
                {t("下一步：", "Next: ", "下一步：")}
                <Link to={available.get(next.id).permalink}>
                  {title(next)} →
                </Link>
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
            "文章页用于查找；这里给出建议顺序。项目页看整体结构，实验页查协议与证据，实践页动手尝试。",
            "Find content in Writing; use this page for reading order, Projects for architecture, Labs for protocols and evidence, and Build for hands-on exploration.",
            "文章頁用於查找；這裡提供建議順序。專案頁看整體結構，實驗頁查協議與證據，實作頁動手嘗試。",
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
            "你的阅读进度，仅保存在当前浏览器。",
            "Your reading progress, stored in this browser only.",
            "你的閱讀進度，僅儲存在目前瀏覽器。",
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
        <div className="hh-controls">
          <label>
            {t("查找选题", "Find a topic", "查找選題")}
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestion(null);
              }}
            />
          </label>
          <label>
            {t("难度", "Difficulty", "難度")}
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setSuggestion(null);
              }}
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
            onClick={() => {
              setSaved(!saved);
              setSuggestion(null);
            }}
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
        {!tracks.some((track) => track.steps.some(matches)) && (
          <p role="status" className="hh-empty">
            {t(
              "没有符合这些筛选条件的选题。清除筛选后可查看完整路线。",
              "No topics match these filters. Clear them to see the full paths.",
              "沒有符合這些篩選條件的選題。清除篩選後可查看完整路線。",
            )}
          </p>
        )}
        {tracks.map((track) => (
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
            <SeriesEntry domain={track.domain} />
            <details
              open={
                track.domain === "ai-apps" ||
                target === "track-" + track.domain ||
                track.steps.some((s) => target === "step-" + s.id) ||
                !!query ||
                saved ||
                difficulty !== "all"
              }
            >
              <summary>
                {t(
                  "已发布的阅读顺序",
                  "Published reading order",
                  "已發布的閱讀順序",
                )}{" "}
                · {track.steps.filter((s) => available.has(s.id)).length}
              </summary>
              <ol className="hh-roadmap">
                {track.steps
                  .filter((s) => available.has(s.id) && matches(s))
                  .map((s) => render(s, track))}
              </ol>
            </details>
            <details
              open={
                track.steps.some(
                  (s) => !available.has(s.id) && target === "step-" + s.id,
                ) ||
                !!query ||
                saved ||
                difficulty !== "all"
              }
            >
              <summary>
                {t(
                  "后续计划 · 尚未发表",
                  "Future topics · unpublished",
                  "後續計畫 · 尚未發表",
                )}
              </summary>
              <ol className="hh-roadmap">
                {track.steps
                  .filter((s) => !available.has(s.id) && matches(s))
                  .map((s) => render(s, track))}
              </ol>
            </details>
          </section>
        ))}
        <section className="hh-section" id="engineering">
          <h2>{t("工程基础", "Engineering foundations", "工程基礎")}</h2>
          <p>Java · Python · TypeScript · HTTP · JSON</p>
          <Link to="/docs/ai-apps">
            {t(
              "AI 应用与工程专题",
              "AI applications and engineering",
              "AI 應用與工程專題",
            )}{" "}
            →
          </Link>
        </section>
        <p>
          <Link to="/reading">{t("阅读清单", "Reading list", "閱讀清單")}</Link>{" "}
          ·{" "}
          <Link to="/research">
            {t("研究总览", "Research overview", "研究總覽")}
          </Link>{" "}
          · <Link to="/build">{t("动手实践", "Build", "動手實作")}</Link>
        </p>
      </main>
    </Layout>
  );
}
