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
import { coreSteps } from "@lab/lib/reading-paths.mjs";
import CacheEvidenceGuide from "@lab/components/CacheEvidenceGuide";
import EmbodiedFieldGuide from "@lab/components/EmbodiedFieldGuide";
import SessionStrategyGuide from "@lab/components/SessionStrategyGuide";
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
  const starting = coreSteps(track)
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
      {!["ai-apps", "llm", "embodied-ai"].includes(category) && (
        <div className="topic-mark">
          <LabSketch kind={topic.sketch} />
        </div>
      )}
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
      {category === "ai-apps" && <SessionStrategyGuide />}
      {category === "llm" && <CacheEvidenceGuide entries={docs} />}
      {category === "embodied-ai" && <EmbodiedFieldGuide entries={docs} />}
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
          title={t("阅读主线", "Core reading path", "閱讀主線")}
        >
          <ol className="topic-core-list">
            {(track.chapters || []).map((chapter) => (
              <li key={chapter.title[1]}>
                <h3>{t(...chapter.title)}</h3>
                <p>{t(...chapter.goal)}</p>
                <ul>
                  {chapter.steps
                    .map((id) => starting.find((entry) => entry.stepId === id))
                    .filter(Boolean)
                    .map((entry) => (
                      <li key={entry.id}>
                        <Link to={entry.href}>{entry.title} →</Link>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ol>
          <p>
            <Link to={"/articles?domain=" + category}>
              {t(
                "本方向全部文章",
                "All articles in this track",
                "本方向全部文章",
              )}{" "}
              →
            </Link>
          </p>
          <Link to={"/learning#track-" + category}>
            {t(
              "查看先修、专题选读与阅读进度",
              "Prerequisites, focused studies and progress",
              "查看先修、專題選讀與閱讀進度",
            )}{" "}
            →
          </Link>
        </Section>
      )}
      {category === "ai-apps" && (
        <p>
          <Link to="/learning#engineering">
            {t(
              "遇到超时、重试或投递问题？查看已有工程实践",
              "Working on deadlines, retries or delivery? Browse the engineering studies",
              "遇到逾時、重試或投遞問題？查看已有工程實作",
            )}{" "}
            →
          </Link>
        </p>
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
      <details>
        <summary>
          {t("论文与参考资料", "Papers and references", "論文與參考資料")}
        </summary>
        <TopicPapers category={category} />
      </details>
      {category !== "rag" && (
        <details>
          <summary>
            {t("相关外部资讯", "Related external signals", "相關外部資訊")}
          </summary>
          <TopicNews category={category} />
        </details>
      )}
      <details className="topic-plans">
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
