"use client";
import { useState } from "react";
import { useText } from "./Shell";
import { rankTeachingDocs } from "../lib/retrieval-ranking.mjs";
import styles from "./LearningExercises.module.css";
export default function RetrievalRanking({ docs }) {
  const t = useText(),
    [weight, setWeight] = useState(50),
    [limit, setLimit] = useState(2);
  const ranked = rankTeachingDocs(weight),
    kept = ranked.slice(0, limit);
  return (
    <details className={styles.exercise}>
      <summary>
        {t("检索排序实验台", "Retrieval ranking bench", "檢索排序實驗臺")}
      </summary>
      <p>
        {t(
          "沿用上面的 A–D 资料。分数为手工设置的教学值，不运行 Embedding，也不代表真实检索质量。",
          "Uses documents A–D above. Scores are hand-authored teaching values, not embeddings or measured retrieval quality.",
          "沿用上面的 A–D 資料。分數為手工設定的教學值，不執行 Embedding，也不代表真實檢索品質。",
        )}
      </p>
      <label>
        {t("关键词权重", "Keyword weight", "關鍵詞權重")}：{weight}%
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
        />
      </label>
      <p>
        {t("语义权重", "Semantic weight", "語義權重")}：{100 - weight}%
      </p>
      <label>
        {t("保留前几条", "Keep top", "保留前幾條")}
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <p className={styles.muted}>
        {t(
          "混合分 = 关键词权重 × 关键词分 + 语义权重 × 语义分；同分按编号排列。",
          "Blend = keyword weight × keyword score + semantic weight × semantic score; ties use document ID.",
          "混合分 = 關鍵詞權重 × 關鍵詞分 + 語義權重 × 語義分；同分按編號排列。",
        )}
      </p>
      <ol>
        {ranked.map((r, i) => (
          <li key={r.id}>
            <strong>
              {r.id} · {docs.find((d) => d[0] === r.id)[1]}
            </strong>{" "}
            — {r.score.toFixed(2)} ·{" "}
            {i < limit
              ? t("保留", "Kept", "保留")
              : t("遗漏", "Omitted", "遺漏")}
            <small className={styles.score}>
              {t("关键词 / 语义", "Keyword / semantic", "關鍵詞 / 語義")}：
              {r.keyword} / {r.semantic}
            </small>
          </li>
        ))}
      </ol>
      <p role="status" className={styles.result}>
        {kept.some((r) => r.id === "A")
          ? t(
              "当前保留了 A 的有效依据；排名仍不能替代版本和来源核验。",
              "Current selection includes evidence A; ranking cannot replace version and source checks.",
              "目前保留了 A 的有效依據；排名仍不能取代版本和來源核驗。",
            )
          : t(
              "当前遗漏了 A；关键词多的旧资料可能排在前面。试着降低关键词权重或扩大保留数量。",
              "A was omitted; keyword-heavy outdated material can rank first. Try reducing keyword weight or keeping more results.",
              "目前遺漏了 A；關鍵詞多的舊資料可能排在前面。試著降低關鍵詞權重或擴大保留數量。",
            )}
      </p>
      <button
        onClick={() => {
          setWeight(50);
          setLimit(2);
        }}
      >
        {t("重置排序", "Reset ranking", "重設排序")}
      </button>
    </details>
  );
}
