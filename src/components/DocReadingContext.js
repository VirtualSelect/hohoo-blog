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
import { learningSymbols } from "@site/src/utils/learning-progress.mjs";
import WritingKind from "./WritingKind";
export default function DocReadingContext({ position }) {
  const { metadata, frontMatter: f } = useDoc();
  const en = useEnglish();
  const { entries } = useContentData("learning-index");
  const state = useLearningProgress();
  const recorded = useRef(null);
  const step = f.learning_step;
  const track = tracks.find((t) => t.steps.some((s) => s.id === step));
  const index = track?.steps.findIndex((s) => s.id === step);
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
              track.steps.length}
        </p>
        <ContentProvenance kind={f.provenance} />
        <Freshness entry={f} />
        <Related
          ids={f.prerequisites || []}
          title={
            en
              ? "Prerequisites"
              : translate({ id: "ui.24e94830a2", message: "前置知识" })
          }
        />
      </div>
    );
  }
  return (
    <>
      {track && (
        <section className="hh-reading-context">
          <h2>
            {en
              ? "You are here"
              : translate({ id: "ui.55d22ed084", message: "当前学习位置" })}
          </h2>
          <p className="hh-eyebrow">
            {uiLabel(track.brand)} / {en ? track.en : track.title}
          </p>
          <ol start={Math.max(0, index - 1) + 1}>
            {track.steps.slice(Math.max(0, index - 1), index + 2).map((s) => {
              const article = entries.find((e) => e.stepId === s.id);
              return (
                <li
                  key={s.id}
                  aria-current={s.id === step ? "step" : undefined}
                >
                  {learningSymbols[state.items[s.id]?.status || "not-started"]}{" "}
                  {s.id === step ? (
                    en ? (
                      s.en
                    ) : (
                      s.title
                    )
                  ) : (
                    <Link to={article?.permalink || "/learning#step-" + s.id}>
                      {en ? s.en : s.title}
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
              ? "Completed"
              : translate({ id: "ui.e99b48a29b", message: "已完成" })}
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
