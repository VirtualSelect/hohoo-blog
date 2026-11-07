import React from "react";
import Link from "@lab/runtime/Link";
import { useText } from "@lab/components/Shell";
import { useContent } from "./ContentUI";
import tracks from "@site/data/learning-paths.json";
import { useSite } from "@lab/runtime/context";
import { coreSteps } from "@lab/lib/reading-paths.mjs";

export default function SeriesEntry({ domain }) {
  const t = useText();
  const { route } = useSite();
  const { entries } = useContent();
  const track = tracks.find((item) => item.domain === domain);
  if (!track) return null;
  const firstStep = coreSteps(track)[0] || track.steps[0];
  const first = entries.find((item) => item.id === "doc:" + firstStep.doc);
  const synthesis = entries.find(
    (item) =>
      item.id === `doc:${track.synthesisDoc || `${domain}/${track.synthesis}`}`,
  );
  const synthesisLabel = {
    "ai-apps": [
      "比较三种会话策略",
      "Compare session strategies",
      "比較三種會話策略",
    ],
    llm: ["看缓存收益与代价", "Explore cache trade-offs", "看快取收益與代價"],
    "embodied-ai": [
      "理解任务完成判据",
      "Understand completion criteria",
      "理解任務完成判據",
    ],
    rag: [
      "看引用校验的边界",
      "Explore citation validation",
      "看引用校驗的邊界",
    ],
  }[domain];
  return (
    <nav
      className="series-entry"
      aria-label={t("系列阅读入口", "Series reading paths", "系列閱讀入口")}
    >
      {first && (
        <Link to={first.href}>
          {t("从主线开始", "Start the core path", "從主線開始")} →
        </Link>
      )}
      {synthesis && <Link to={synthesis.href}>{t(...synthesisLabel)} →</Link>}
      {["learning", "research"].includes(route) ? (
        <Link to={"/docs/" + domain}>
          {t("专题总览", "Topic overview", "專題總覽")} →
        </Link>
      ) : (
        <Link to={"/learning#track-" + domain}>
          {t("按顺序学习", "Follow the reading order", "依順序學習")} →
        </Link>
      )}
    </nav>
  );
}
