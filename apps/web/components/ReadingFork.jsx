"use client";
import { useState } from "react";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import { readingForks } from "../lib/reading-forks.mjs";
import styles from "./LearningExercises.module.css";
export default function ReadingFork() {
  const { document: d, globalData } = useSite(),
    t = useText(),
    [intent, setIntent] = useState("concepts");
  const entries = globalData["content-index"].entries;
  const currentId = (d.kind === "blog" ? "blog:" : "doc:") + d.metadata.id;
  const choices = readingForks(
    entries.filter((e) => !e.href.endsWith("/" + d.route)),
    currentId,
    d.frontMatter,
  );
  const labels = {
    concepts: t("没看懂概念", "Clarify a concept", "沒看懂概念"),
    practice: t("想动手", "Try it myself", "想動手"),
    deeper: t("继续深入", "Go deeper", "繼續深入"),
  };
  return (
    <section className={styles.exercise} aria-labelledby="fork-title">
      <h2 id="fork-title">
        {t("接下来，走哪条路？", "Which way next?", "接下來，走哪條路？")}
      </h2>
      <div className={styles.choices}>
        {Object.entries(labels).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={intent === id}
            onClick={() => setIntent(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {choices[intent].length ? (
          <ul>
            {choices[intent].map((e) => (
              <li key={e.id}>
                <Link to={e.href}>{e.title} →</Link>
                <p className={styles.muted}>{e.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {t(
              "这篇文章暂时没有对应的已发布关联内容。",
              "This article has no published related material for this choice yet.",
              "這篇文章暫時沒有對應的已發布關聯內容。",
            )}{" "}
            <Link to="/learning">
              {t(
                "回到学习路线选择下一步",
                "Choose a next step on the learning path",
                "回到學習路線選擇下一步",
              )}{" "}
              →
            </Link>
          </p>
        )}
      </div>
      {intent === "concepts" && d.route === "docs/ai-apps/java-first-llm" && (
        <a href="#conversation-workbench">
          {t(
            "回到本文对话记忆演示",
            "Revisit the conversation memory demo",
            "回到本文對話記憶演示",
          )}{" "}
          ↑
        </a>
      )}
      <p className={styles.muted}>
        {t(
          "依据文章关联与同主题已发布内容整理，不使用随机推荐。",
          "Based on article relationships and published same-topic content, not random recommendations.",
          "依據文章關聯與同主題已發布內容整理，不使用隨機推薦。",
        )}
      </p>
    </section>
  );
}
