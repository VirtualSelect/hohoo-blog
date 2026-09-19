"use client";
import { useState } from "react";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import { writingEntries } from "@site/src/utils/localization.cjs";
import styles from "./DiscoveryCompass.module.css";

export default function DiscoveryCompass() {
  const { globalData, items } = useSite();
  const t = useText();
  const [mode, setMode] = useState(0);
  const [index, setIndex] = useState(0);
  const entries = globalData["content-index"].entries;
  const options = [
    {
      label: t("读一篇文章", "Read something", "讀一篇文章"),
      reason: t(
        "从已经发布的文章开始，留下一个新的理解。",
        "Start with published writing and take away a new understanding.",
        "從已經發布的文章開始，留下一個新的理解。",
      ),
      pool: writingEntries(entries),
    },
    {
      label: t("看看怎么做", "See how it’s built", "看看怎麼做"),
      reason: t(
        "走进真实项目，看看代码、取舍和实践过程。",
        "Look inside a real project: code, decisions, and practice.",
        "走進真實專案，看看程式碼、取捨和實作過程。",
      ),
      pool: entries.filter(
        (e) =>
          e.type === "project" &&
          ["building", "production", "experiment"].includes(e.status),
      ),
    },
    {
      label: t("发现新进展", "Discover a signal", "發現新進展"),
      reason: t(
        "看看外部世界的新进展。以下是来源摘录，点击前往原文。",
        "Explore an external development. This is a source excerpt; the link opens the original.",
        "看看外部世界的新進展。以下是來源摘錄，點擊前往原文。",
      ),
      pool: items
        .slice(0, 10)
        .map((item) => ({
          ...item,
          href: item.url,
          description: item.summary,
          date: item.publishedAt?.slice(0, 10),
        })),
    },
  ];
  const selected = options[mode];
  const entry = selected.pool[index % (selected.pool.length || 1)];
  return (
    <section
      className={`home-section ${styles.section}`}
      aria-labelledby="compass-title"
    >
      <div className={styles.intro}>
        <svg
          viewBox="0 0 100 100"
          className={styles.compass}
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="44" />
          <path d="M50 2v12M50 86v12M2 50h12M86 50h12" />
          <g style={{ transform: `rotate(${mode * 120}deg)` }}>
            <path d="M50 20 60 60 50 54 40 60Z" />
          </g>
          <circle cx="50" cy="50" r="2" />
        </svg>
        <div>
          <p className="eyebrow">
            {t("好奇心指南针", "Curiosity compass", "好奇心指南針")}
          </p>
          <h2 id="compass-title">
            {t(
              "今天，往哪个方向走？",
              "Where will curiosity take you?",
              "今天，往哪個方向走？",
            )}
          </h2>
        </div>
      </div>
      <fieldset className={styles.choices}>
        <legend className={styles.legend}>
          {t(
            "选择今天的探索方式",
            "Choose how to explore",
            "選擇今天的探索方式",
          )}
        </legend>
        {options.map((option, i) => (
          <label key={i}>
            <input
              type="radio"
              name="discovery-intent"
              checked={mode === i}
              onChange={() => {
                setMode(i);
                setIndex(0);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <div className={styles.result} aria-live="polite" aria-atomic="true">
        <p className={styles.reason}>{selected.reason}</p>
        {entry ? (
          <>
            <p className={styles.meta}>
              {mode === 2
                ? entry.sourceName
                : mode === 1
                  ? t("项目实践", "Project", "專案實作")
                  : t("本站文章", "Site writing", "本站文章")}{" "}
              {entry.date && (
                <>
                  · <time>{entry.date}</time>
                </>
              )}
            </p>
            <h3>
              {mode === 2 ? (
                <a href={entry.href}>{entry.title} ↗</a>
              ) : (
                <Link to={entry.href}>{entry.title} →</Link>
              )}
            </h3>
            <p className={styles.description}>{entry.description}</p>
          </>
        ) : (
          <p>
            {t(
              "这个方向暂时没有可推荐的内容，试试另一个方向。",
              "Nothing to recommend here yet. Try another direction.",
              "這個方向暫時沒有可推薦的內容，試試另一個方向。",
            )}
          </p>
        )}
      </div>
      <div className={styles.bottom}>
        <small>
          {t(
            "基于本站现有内容 · 不追踪你的偏好",
            "From existing content · No preference tracking",
            "依據本站現有內容 · 不追蹤你的偏好",
          )}
        </small>
        {selected.pool.length > 1 && (
          <button
            type="button"
            onClick={() =>
              setIndex((value) => (value + 1) % selected.pool.length)
            }
          >
            {t("换一个发现", "Another discovery", "換一個發現")} ↻
          </button>
        )}
      </div>
    </section>
  );
}
