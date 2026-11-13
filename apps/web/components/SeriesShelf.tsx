"use client";
import tracks from "@site/data/learning-paths.json";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import type { ContentEntry } from "../lib/site-types";

export default function SeriesShelf({ entries }: { entries: ContentEntry[] }) {
  const t = useText();
  return (
    <section
      className="series-shelf"
      aria-label={t(
        "按问题串起系列",
        "Read a connected series",
        "依問題串起系列",
      )}
    >
      {tracks.map((track, index) => {
        const chapters = track.chapters
          .map((chapter) => ({
            ...chapter,
            article: entries.find(
              (entry) =>
                entry.id ===
                "doc:" +
                  track.steps.find((step) => step.id === chapter.steps[0])?.doc,
            ),
          }))
          .filter((chapter) => chapter.article);
        if (!chapters.length) return null;
        return (
          <article key={track.domain}>
            <header>
              <span className="obs-kicker">
                0{index + 1} / {t("阅读主线", "CORE READING", "閱讀主線")}
              </span>
              <h2>{t(track.title, track.en, track.titleTw)}</h2>
            </header>
            <ol>
              {chapters.map((chapter) => (
                <li key={chapter.article!.id}>
                  <Link to={chapter.article!.href}>
                    {t(chapter.title[0], chapter.title[1], chapter.title[2])}{" "}
                    <span>↗</span>
                  </Link>
                </li>
              ))}
            </ol>
            <footer>
              {track.synthesisHref && (
                <Link to={track.synthesisHref}>
                  {t("先看综合结论", "Read the synthesis", "先看綜合結論")} →
                </Link>
              )}
              <Link to={chapters[0].article!.href}>
                {t(
                  "从第一篇开始",
                  "Start with the first article",
                  "從第一篇開始",
                )}{" "}
                →
              </Link>
              <Link to={`/learning?track=${track.domain}`}>
                {t(
                  "先修与完整路线",
                  "Prerequisites and full path",
                  "先修與完整路線",
                )}{" "}
                ↗
              </Link>
            </footer>
          </article>
        );
      })}
    </section>
  );
}
