import { uiLabel } from "@site/src/utils/ui-labels";
import { translate } from "@lab/runtime/Translate";
import ContentProvenance, { Freshness } from "./ContentProvenance";
import React, { useEffect, useRef } from "react";
import Link from "@lab/runtime/Link";
import { useDoc } from "@lab/runtime/doc";
import { useContentData } from "@lab/runtime/data";
import tracks from "@site/data/learning-paths.json";
import { Related, useEnglish } from "./ContentUI";
import useLearningProgress from "./useLearningProgress";
import { learningSymbols } from "@site/src/utils/learning-progress.ts";
import WritingKind from "./WritingKind";
import { useText } from "@lab/components/Shell";
export default function DocReadingContext({ position }) {
  const { metadata, frontMatter: f } = useDoc();
  const en = useEnglish();
  const t = useText();
  const { entries } = useContentData("learning-index");
  const content = useContentData("content-index").entries;
  const prerequisites = (f.prerequisites || [])
    .map((id) => content.find((entry) => entry.id === id))
    .filter(Boolean);
  const state = useLearningProgress();
  const recorded = useRef(null);
  const step = f.learning_step;
  const track = tracks.find((t) => t.steps.some((s) => s.id === step));
  const routeSteps =
    track?.steps.filter((s) => entries.some((e) => e.stepId === s.id)) || [];
  const index = routeSteps.findIndex((s) => s.id === step);
  const currentStep = track?.steps.find((s) => s.id === step);
  const reviewNotice = currentStep?.reviewNotice;
  const adjacent = track
    ? track.steps
        .map((s) => entries.find((e) => e.stepId === s.id))
        .filter(Boolean)
    : [];
  const publishedIndex = adjacent.findIndex((e) => e.stepId === step);
  const nextArticle = publishedIndex >= 0 ? adjacent[publishedIndex + 1] : null;
  useEffect(() => {
    if (
      position === "header" &&
      state.ready &&
      step &&
      recorded.current !== step
    ) {
      recorded.current = step;
      state.update(
        step,
        state.items[step]?.status === "completed" ? "completed" : "reading",
      );
    }
  }, [step, state.ready, position]);
  if (position === "header") {
    if (!f.domain && !step) return null;
    return (
      <div className="hh-reading-context">
        <p className="hh-eyebrow">
          {uiLabel(f.domain || track?.domain)}
          {track && " / " + uiLabel(track.brand)}
          {" · "}
          <WritingKind entry={{ ...f, type: "doc" }} />
        </p>
        {metadata.description && <p>{metadata.description}</p>}
        <p className="hh-meta">
          {uiLabel(f.difficulty)}
          {f.reading_minutes &&
            " · " + f.reading_minutes + " " + uiLabel("MIN")}
          {f.updated && " · " + uiLabel("UPDATED") + " " + f.updated}
          {track &&
            " · " +
              uiLabel("PART") +
              " " +
              (index + 1) +
              " / " +
              routeSteps.length}
        </p>
        {track?.steps.find((s) => s.id === step)?.followUps?.length > 0 && (
          <details className="article-followups">
            <summary>
              {t(
                "这篇之后，已经有了哪些结果？",
                "What was published after this article?",
                "這篇之後，已經有了哪些結果？",
              )}
            </summary>
            <p>
              {t(
                "保留本文发表时的结论与下一步设想；以下是已发表的后续内容，不代表所有局限都已解决。",
                "The original conclusions and next-step proposals are retained. These published follow-ups do not imply that every limitation has been resolved.",
                "保留本文發表時的結論與下一步構想；以下是已發布的後續內容，不代表所有侷限皆已解決。",
              )}
            </p>
            <Related ids={track.steps.find((s) => s.id === step).followUps} />
          </details>
        )}
        {reviewNotice && (
          <aside className="article-followups">
            <p className="hh-eyebrow">
              {t("复核说明", "Review note", "複核說明")} · {reviewNotice.date}
            </p>
            <p>{t(...reviewNotice.text)}</p>
            {reviewNotice.href !== `/docs/${currentStep.doc}` && (
              <Link to={reviewNotice.href}>
                {t("查看边界说明", "Read the limitation", "查看邊界說明")} →
              </Link>
            )}
            {reviewNotice.fixHref && (
              <p>
                <a
                  href={reviewNotice.fixHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(
                    "查看修正版与回归命令",
                    "View the fix and regression commands",
                    "查看修正版與回歸指令",
                  )}{" "}
                  ↗
                </a>
              </p>
            )}
          </aside>
        )}
        <ContentProvenance kind={f.provenance} />
        <Freshness entry={f} />
        {prerequisites.length > 0 && (
          <nav
            className="reading-prerequisites"
            aria-label={t("前置知识", "Prerequisites", "前置知識")}
          >
            <span className="hh-eyebrow">
              {t("先修", "Prerequisites", "先修")}
            </span>
            {prerequisites.map((entry) => (
              <Link key={entry.id} to={entry.href}>
                {entry.title} →
              </Link>
            ))}
          </nav>
        )}
      </div>
    );
  }
  return (
    <>
      {track && (
        <section className="hh-reading-context">
          {nextArticle && (
            <p>
              <Link to={nextArticle.permalink}>
                {en
                  ? "Next published article"
                  : translate({
                      id: "reading.nextPublished",
                      message: "下一篇已发布内容",
                    })}
                ：{nextArticle.title} →
              </Link>
            </p>
          )}
          <h2>
            {en
              ? "You are here"
              : translate({ id: "ui.55d22ed084", message: "当前学习位置" })}
          </h2>
          <p className="hh-eyebrow">
            {uiLabel(track.brand)} / {t(track.title, track.en, track.titleTw)}
          </p>
          <ol start={Math.max(0, index - 1) + 1}>
            {routeSteps.slice(Math.max(0, index - 1), index + 2).map((s) => {
              const article = entries.find((e) => e.stepId === s.id);
              return (
                <li
                  key={s.id}
                  aria-current={s.id === step ? "step" : undefined}
                >
                  {learningSymbols[state.items[s.id]?.status || "not-started"]}{" "}
                  {s.id === step ? (
                    article?.title || (en ? s.en : s.title)
                  ) : (
                    <Link to={article?.permalink || "/learning#step-" + s.id}>
                      {article?.title || (en ? s.en : s.title)}
                    </Link>
                  )}
                  {!article && " · " + uiLabel("PLANNED")}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            disabled={!state.ready}
            aria-pressed={state.items[step]?.status === "completed"}
            onClick={() =>
              state.update(
                step,
                state.items[step]?.status === "completed"
                  ? "reading"
                  : "completed",
              )
            }
          >
            ✓{" "}
            {en
              ? state.items[step]?.status === "completed"
                ? "Completed"
                : "Mark completed"
              : state.items[step]?.status === "completed"
                ? translate({ id: "ui.e99b48a29b", message: "已完成" })
                : translate({
                    id: "reading.markCompleted",
                    message: "标记完成",
                  })}
          </button>
          {state.error && (
            <p role="status">
              {en
                ? "Storage unavailable; this visit only."
                : translate({
                    id: "ui.1d61990f22",
                    message: "存储不可用，仅本次访问保留。",
                  })}
            </p>
          )}
        </section>
      )}
      <Related ids={f.related || []} />
    </>
  );
}
