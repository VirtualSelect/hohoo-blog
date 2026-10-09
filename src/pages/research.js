import { uiLabel } from "@site/src/utils/ui-labels";
import React from "react";
import Layout from "@lab/runtime/Layout";
import Link from "@lab/runtime/Link";
import { useText } from "@lab/components/Shell";
import topics from "@site/data/topics";
import papers from "@site/data/papers.json";
import styles from "./research.module.css";

export default function Research() {
  const t = useText();
  return (
    <Layout
      title={t("研究", "Research", "研究")}
      description={t(
        "AI 应用、LLM、具身智能与 RAG 的阅读和研究入口。",
        "Reading and research across AI applications, LLMs, embodied AI and RAG.",
        "AI 應用、LLM、具身智能與 RAG 的閱讀和研究入口。",
      )}
    >
      <main className={styles.page}>
        <p className={styles.kicker}>{uiLabel("LEARN / BUILD / UNDERSTAND")}</p>
        <h1>
          {t(
            "从一个问题，深入一点。",
            "Follow a question.",
            "從一個問題，深入一點。",
          )}
        </h1>
        <p className={styles.lead}>
          {t(
            "将论文、阅读路线和实验串在同一个研究方向下。先选一个问题，再决定如何深入。",
            "Topics connect paper guides, learning plans and experiments. Choose a question, then a path.",
            "將論文、閱讀路線和實驗串在同一個研究方向下。先選一個問題，再決定如何深入。",
          )}
        </p>
        <section className={styles.topics}>
          {topics.map((topic, index) => (
            <article key={topic.id}>
              <small>
                0{index + 1} / {uiLabel(topic.tag)}
              </small>
              <h2>
                <Link to={"/docs/" + topic.id}>
                  {t(topic.title, topic.en, topic.titleTw)} ↗
                </Link>
              </h2>
              <p>{t(topic.description, topic.english, topic.descriptionTw)}</p>
              <p className="hh-eyebrow">{uiLabel("PROBLEM / CONCEPT PATH")}</p>
              <ul>
                {papers
                  .filter((p) => p.categories.includes(topic.id))
                  .map((p) => (
                    <li key={p.id}>
                      <Link to={"/papers#" + p.slug}>
                        {(p.concepts || []).join(" / ")} · {p.short} →
                      </Link>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </section>
        <section className={styles.resources}>
          <h2>{t("接下来怎么读", "Ways to explore", "接下來怎麼讀")}</h2>
          {[
            [
              "/learning",
              t("阅读路线", "Reading paths", "閱讀路線"),
              t(
                "按前置知识与阶段推进，查看已发布记录。",
                "Prerequisites, stages and published notes.",
                "依先修知識與階段推進，查看已發布記錄。",
              ),
            ],
            [
              "/papers",
              t("论文阅读", "Paper guides", "論文閱讀"),
              t(
                "从研究问题、方法和证据边界入手。",
                "Questions, methods and the boundaries of evidence.",
                "從研究問題、方法和證據邊界入手。",
              ),
            ],
            [
              "/projects",
              t("项目", "Projects", "專案"),
              t(
                "查看实际代码，以及明确标注的实验计划。",
                "Working code and clearly marked experiment plans.",
                "查看實際程式碼，以及明確標註的實驗計畫。",
              ),
            ],
          ].map(([to, title, description]) => (
            <Link key={to} to={to}>
              <strong>{title} →</strong>
              <span>{description}</span>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}
