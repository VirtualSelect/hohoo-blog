import React from "react";
import Link from "@lab/runtime/Link";
import { useText } from "@lab/components/Shell";
import { useContent } from "./ContentUI";
import tracks from "@site/data/learning-paths.json";
import { useSite } from "@lab/runtime/context";

export default function SeriesEntry({ domain }) {
  const t = useText();
  const { route } = useSite();
  const { entries } = useContent();
  const track = tracks.find((item) => item.domain === domain);
  if (!track) return null;
  const first = entries.find((item) => item.id === "doc:" + track.steps[0].doc);
  const synthesis = entries.find(
    (item) => item.id === `doc:${domain}/${track.synthesis}`,
  );
  return (
    <nav
      className="series-entry"
      aria-label={t("系列阅读入口", "Series reading paths", "系列閱讀入口")}
    >
      {first && (
        <Link to={first.href}>
          {t("从第一篇开始", "Start with the first article", "從第一篇開始")} →
        </Link>
      )}
      {synthesis && (
        <Link to={synthesis.href}>
          {t("直接看综合结论", "Jump to the synthesis", "直接看綜合結論")} →
        </Link>
      )}
      {route === "learning" ? (
        <a href={"#track-" + domain}>
          {t("按顺序学习", "Follow the reading order", "依順序學習")} →
        </a>
      ) : (
        <Link to={"/learning#track-" + domain}>
          {t("按顺序学习", "Follow the reading order", "依順序學習")} →
        </Link>
      )}
    </nav>
  );
}
