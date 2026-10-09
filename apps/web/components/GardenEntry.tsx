"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import s from "./EmergenceGarden.module.css";

// Static, hand-authored glider phases: no simulation engine or running timer on Home.
const phases = [
  [1, 7, 10, 11, 12],
  [5, 7, 11, 12, 16],
  [7, 10, 12, 16, 17],
];
export default function GardenEntry() {
  const t = useText();
  return (
    <aside className={s.entry} aria-labelledby="garden-entry-title">
      <div>
        <p className={s.kicker}>
          {t(
            "新探索 / 规则的游乐场",
            "NEW / A PLAYGROUND OF RULES",
            "新探索 / 規則的遊樂場",
          )}
        </p>
        <h3 id="garden-entry-title">
          {t(
            "种下简单，长出意外。",
            "Simple seeds. Unexpected worlds.",
            "種下簡單，長出意外。",
          )}
        </h3>
        <p>
          {t(
            "一格的规则，整片花园的故事。亲手种植、回看演化，把喜欢的一帧做成明信片。",
            "One cell’s rule, a whole garden’s story. Plant, rewind, and turn a favorite frame into a postcard.",
            "一格的規則，整片花園的故事。親手種植、回看演化，把喜歡的一幀做成明信片。",
          )}
        </p>
        <Link to="/build?tool=emergence#workbench">
          {t("走进涌现花园", "Enter the emergence garden", "走進湧現花園")}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div
        className={s.preview}
        aria-label={t(
          "滑翔机的前三帧示意",
          "The first three glider frames",
          "滑翔機的前三幀示意",
        )}
      >
        {phases.map((alive, frame) => (
          <figure key={frame}>
            <svg viewBox="0 0 110 110" aria-hidden="true">
              {Array.from({ length: 25 }, (_, i) => (
                <rect
                  key={i}
                  x={7 + (i % 5) * 21}
                  y={7 + Math.floor(i / 5) * 21}
                  width={alive.includes(i) ? 15 : 3}
                  height={alive.includes(i) ? 15 : 3}
                  rx={alive.includes(i) ? 4 : 1}
                  fill="currentColor"
                  opacity={alive.includes(i) ? 1 : 0.35}
                />
              ))}
            </svg>
            <figcaption>
              {t("第", "GEN", "第")} 0{frame} {t("代", "", "代")}
            </figcaption>
          </figure>
        ))}
      </div>
    </aside>
  );
}
