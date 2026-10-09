import { uiLabel } from "@site/src/utils/ui-labels";
import React from "react";
import Link from "@lab/runtime/Link";
import tracks from "@site/data/learning-paths.json";
import topics from "@site/data/topics";
import { Section, ContentRows, useContent } from "./ContentUI";
import TopicPapers from "./TopicPapers";
import SeriesEntry from "./SeriesEntry";
import TopicNews from "./TopicNews";
import { useText } from "@lab/components/Shell";
import LabSketch from "@lab/components/LabSketch";
export default function TopicLanding({ category }) {
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
  const starting = track.steps
    .map((s) => docs.find((e) => e.id === "doc:" + s.doc))
    .filter(Boolean);
  const projects = entries.filter(
    (entry) =>
      entry.type === "project" &&
      (entry.domain === category ||
        docs.some((doc) => doc.related?.includes(entry.id))),
  );
  return (
    <div className="topic-landing" data-domain={category}>
      <p className="hh-eyebrow">
        0{topics.indexOf(topic) + 1} / {uiLabel(topic.tag)}
      </p>
      <p className="hh-lead">
        {t(topic.description, topic.english, topic.descriptionTw)}
      </p>
      <div className="topic-mark">
        <LabSketch kind={topic.sketch} />
      </div>
      {track.pipeline && (
        <ol className="topic-pipeline">
          {track.pipeline.map((stage) => (
            <li key={stage[1]}>{t(...stage)}</li>
          ))}
        </ol>
      )}
      {track.boundary && (
        <p className="topic-boundary">{t(...track.boundary)}</p>
      )}
      <SeriesEntry domain={category} />
      {category === "rag" && (
        <p>
          <Link to="/docs/rag#retrieval-exercise">
            {t(
              "先动手：选择证据与调整排序",
              "Try it: choose evidence and adjust ranking",
              "先動手：選擇證據與調整排序",
            )}{" "}
            →
          </Link>
        </p>
      )}
      {starting.length > 0 && (
        <Section
          label={uiLabel("START HERE")}
          title={t(
            "系列总览 · 建议阅读顺序",
            "Series overview · suggested reading order",
            "系列總覽 · 建議閱讀順序",
          )}
        >
          <ContentRows items={starting} />
        </Section>
      )}
      {category === "ai-apps" && (
        <Section
          label={uiLabel("AI ENGINEERING")}
          title={t(
            "从应用实现，到工程交付",
            "From application to delivery",
            "從應用實作，到工程交付",
          )}
        >
          <p className="hh-lead">
            {t(
              "AI 应用开发的工程子方向。",
              "An engineering subdirection of AI applications.",
              "AI 應用開發的工程子方向。",
            )}
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
            {t("工程选题 →", "Engineering topics →", "工程選題 →")}
          </Link>
          <p>
            <Link to="/docs/rag">
              {t(
                "知识检索与回答评估：进入 RAG 专题",
                "Knowledge retrieval and answer evaluation: explore RAG",
                "知識檢索與回答評估：進入 RAG 專題",
              )}{" "}
              →
            </Link>
          </p>
        </Section>
      )}
      {projects.length > 0 && (
        <Section
          label={uiLabel("PROJECTS")}
          title={t("相关项目", "Related projects", "相關專案")}
        >
          <ContentRows items={projects} />
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
      {category !== "rag" && <TopicNews category={category} />}
      <details className="topic-plans" open={category === "rag"}>
        <summary>
          {t(
            "学习路线与后续选题",
            "Learning path & planned topics",
            "學習路線與後續選題",
          )}
        </summary>
        <p>
          {t(
            "以下为待完成选题，不代表已有实验结果。",
            "These are future topics, not completed experiments.",
            "以下為待完成選題，不代表已有實驗結果。",
          )}
        </p>
        <ol className="topic-roadmap">
          {track.steps
            .filter((s) => !s.doc)
            .map((s) => {
              const article = docs.find((d) => d.stepId === s.id);
              return (
                <li key={s.id}>
                  <Link to={article?.href || "/learning#step-" + s.id}>
                    {article?.title || t(s.title, s.en, s.titleTw)}
                  </Link>
                  {!article && (
                    <small className="hh-meta"> · {uiLabel("PLANNED")}</small>
                  )}
                  {s.plan && <p>{t(s.outcome, s.outcomeEn, s.outcomeTw)}</p>}
                </li>
              );
            })}
        </ol>
      </details>
      <p>
        <Link to="/learning">
          {t(
            "继续系统学习 →",
            "Continue along a learning path →",
            "繼續系統學習 →",
          )}
        </Link>
      </p>
    </div>
  );
}
