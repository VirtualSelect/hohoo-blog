"use client";
import { useText } from "./Shell";
import { researchCases, researchFinding } from "../lib/research-cases";
import evidence from "../generated/question-evidence.json";
import type { Heading } from "../lib/site-types";

export default function ArticleBrief({
  route,
  headings,
}: {
  route: string;
  headings: Heading[];
}) {
  const t = useText();
  const scene = researchCases.find(
    (scene) => evidence.sources[scene.id].doc === "/" + route,
  );
  if (!scene) return null;
  const source = evidence.sources[scene.id];
  const result = headings.find(
    (heading) =>
      heading.depth === 2 &&
      /结果|結果|本机|本機|发现|發現|result|finding/i.test(heading.text),
  );
  const reproduce = headings.find(
    (heading) =>
      heading.depth === 2 &&
      /复现|復現|重現|reproduc|干净目录|乾淨目錄/i.test(heading.text),
  );
  return (
    <aside
      className="article-brief"
      aria-label={t("先看关键发现", "The finding first", "先看關鍵發現")}
    >
      <div>
        <span className="obs-kicker">
          {t("关键发现", "THE FINDING", "關鍵發現")}
        </span>
        <p>{researchFinding(scene.id, scene.id === "cache" ? 1 : 0, t)}</p>
      </div>
      <nav
        aria-label={t(
          "直达结果与复现",
          "Jump to results and reproduction",
          "直達結果與重現",
        )}
      >
        {result && (
          <a href={"#" + result.id}>
            {t("直接看对照结果", "Go to results", "直接看對照結果")} ↓
          </a>
        )}
        {reproduce && (
          <a href={"#" + reproduce.id}>
            {t("最小复现步骤", "Reproduction steps", "最小重現步驟")} ↓
          </a>
        )}
        <a href={source.code} target="_blank" rel="noreferrer">
          {t("固定版本代码", "Pinned code", "固定版本程式碼")} ↗
        </a>
        <a href={source.evidence} target="_blank" rel="noreferrer">
          {t("原始记录", "Source records", "原始紀錄")} ↗
        </a>
      </nav>
    </aside>
  );
}
