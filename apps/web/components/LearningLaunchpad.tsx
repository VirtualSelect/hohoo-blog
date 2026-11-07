"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import tracks from "@site/data/learning-paths.json";
import type { ContentEntry, Domain } from "../lib/site-types";
export default function LearningLaunchpad({
  entries,
  onChoose,
}: {
  entries: ContentEntry[];
  onChoose: (domain: Domain | "all") => void;
}) {
  const t = useText();
  return (
    <section
      className="path-picker"
      aria-label={t(
        "选择学习方向",
        "Choose a learning direction",
        "選擇學習方向",
      )}
    >
      {tracks.map((track, index) => {
        const first = track.steps.find(
          (step) => step.id === track.chapters[0]?.steps[0],
        );
        const article = entries.find(
          (entry) => entry.id === "doc:" + first?.doc,
        );
        return (
          <article key={track.domain}>
            <span className="obs-kicker">0{index + 1}</span>
            <div>
              <h2>{t(track.title, track.en, track.titleTw)}</h2>
              <p>
                {t(
                  track.entryDescription[0],
                  track.entryDescription[1],
                  track.entryDescription[2],
                )}
              </p>
            </div>
            <div className="path-picker-actions">
              {article && (
                <Link to={article.href}>
                  {t("从第一篇开始", "Read the first article", "從第一篇開始")}{" "}
                  ↗
                </Link>
              )}
              <button onClick={() => onChoose(track.domain as Domain)}>
                {t("看路线", "See the path", "看路線")} →
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
