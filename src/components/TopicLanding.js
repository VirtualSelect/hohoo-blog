import { uiLabel } from "@site/src/utils/ui-labels";
import React from "react";
import Link from "@lab/runtime/Link";
import tracks from "@site/data/learning-paths.json";
import topics from "@site/data/topics";
import { Section, ContentRows, useContent, useEnglish } from "./ContentUI";
import TopicPapers from "./TopicPapers";
import TopicNews from "./TopicNews";
import { useText } from "@lab/components/Shell";
import LabSketch from "@lab/components/LabSketch";
import { writingKind } from "../utils/writing-kinds.cjs";
export default function TopicLanding({ category }) {
  const en = useEnglish();
  const t = useText();
  const { entries } = useContent();
  const topic = topics.find((t) => t.id === category);
  const track =
    tracks.find((t) => t.domain === category) ||
    tracks.find(
      (t) =>
        t.id === (category === "embodied-ai" ? "embodied" : "applications"),
    );
  const docs = entries.filter(
    (e) =>
      e.domain === category &&
      e.status === "published" &&
      ["doc", "note"].includes(e.type) &&
      e.translationStatus !== "MISSING",
  );
  const engineering =
    category === "ai-apps"
      ? docs.filter((e) => writingKind(e) === "case-study")
      : [];
  const starting = docs.filter((e) => !engineering.includes(e));
  return (
    <div className="topic-landing" data-domain={category}>
      <p className="hh-eyebrow">
        0{topics.indexOf(topic) + 1} / {uiLabel(topic.tag)}
      </p>
      <p className="hh-lead">{en ? topic.english : topic.description}</p>
      <div className="topic-mark">
        <LabSketch
          kind={
            category === "llm"
              ? "model"
              : category === "embodied-ai"
                ? "embodied"
                : "application"
          }
        />
      </div>
      {starting.length > 0 && (
        <Section
          label={uiLabel("START HERE")}
          title={t(
            "先读一篇，再动手试试",
            "Read, then try it yourself",
            "先讀一篇，再動手試試",
          )}
        >
          <ContentRows items={starting} />
        </Section>
      )}
      {category === "ai-apps" && (
        <Section
          label={uiLabel("AI ENGINEERING")}
          title={en ? "From application to delivery" : "从应用实现，到工程交付"}
        >
          {engineering.length > 0 && <ContentRows items={engineering} />}
          <p className="hh-lead">
            {en
              ? "An application subdirection, not a separate track."
              : "AI Applications 的工程子方向。"}
          </p>
          <ul className="hh-concepts">
            {[
              "AI Coding",
              "Codex",
              "MCP",
              "Skills",
              "Harness",
              "Testing",
              "Evals",
              "Observability",
              "Production",
              "Performance",
            ].map((s) => (
              <li key={s}>{uiLabel(s)}</li>
            ))}
          </ul>
          <Link to="/learning#engineering">
            {en ? "Engineering topics →" : "工程选题 →"}
          </Link>
        </Section>
      )}
      {entries.some((e) => e.domain === category && e.type === "project") && (
        <Section
          label={uiLabel("PROJECTS")}
          title={en ? "Working builds" : "相关项目"}
        >
          <ContentRows
            items={entries.filter(
              (e) => e.domain === category && e.type === "project",
            )}
          />
        </Section>
      )}
      {entries.some(
        (e) =>
          e.domain === category && e.type === "lab" && e.status !== "planning",
      ) && (
        <details>
          <summary>{t("相关实验", "Related experiments", "相關實驗")}</summary>
          <ContentRows
            items={entries.filter(
              (e) =>
                e.domain === category &&
                e.type === "lab" &&
                e.status !== "planning",
            )}
          />
        </details>
      )}
      <TopicPapers category={category} />
      <TopicNews category={category} />
      <details className="topic-plans">
        <summary>
          {t(
            "学习路线与后续选题",
            "Learning path & planned topics",
            "學習路線與後續選題",
          )}
        </summary>
        <ol className="hh-concepts">
          {track.steps.slice(0, 7).map((s) => {
            const article = docs.find((d) => d.stepId === s.id);
            return (
              <li key={s.id}>
                <Link to={article?.href || "/learning#step-" + s.id}>
                  {article?.title || (en ? s.en : s.title)}
                </Link>
                {!article && (
                  <small className="hh-meta"> · {uiLabel("PLANNED")}</small>
                )}
              </li>
            );
          })}
        </ol>
      </details>
      <p>
        <Link to="/learning">
          {en ? "Continue along a learning path →" : "继续系统学习 →"}
        </Link>
      </p>
    </div>
  );
}
