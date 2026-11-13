"use client";
import Link from "../runtime/Link";
import { Fragment } from "react";
import { useText } from "./Shell";
import tracks from "@site/data/learning-paths.json";
import type { Domain } from "../lib/site-types";
export default function ResearchPortal({
  domain,
  onSelect,
}: {
  domain: Domain | "all";
  onSelect: (domain: Domain) => void;
}) {
  const t = useText();
  return (
    <section
      className="atlas-directions"
      aria-labelledby="atlas-directions-heading"
    >
      <header className="atlas-section-heading">
        <h2 id="atlas-directions-heading">
          {t("研究方向", "Research directions", "研究方向")}
        </h2>
      </header>
      <div
        className="atlas-direction-buttons"
        role="group"
        aria-label={t(
          "选择研究方向",
          "Choose a research direction",
          "選擇研究方向",
        )}
      >
        {tracks.map((track, index) => (
          <Fragment key={track.id}>
            <button
              type="button"
              key={track.id}
              aria-pressed={track.domain === domain}
              aria-controls="atlas-feature"
              onClick={() => onSelect(track.domain as Domain)}
            >
              <span className="atlas-direction-number" aria-hidden="true">
                0{index + 1}
              </span>
              <span className="atlas-direction-copy">
                <strong>{t(track.title, track.en, track.titleTw)}</strong>
                <small className="atlas-direction-detail">
                  {t(...(track.entryDescription as [string, string, string]))}
                </small>
              </span>
              <span className="atlas-direction-arrow" aria-hidden="true">
                →
              </span>
            </button>
            <Link
              className="atlas-direction-route"
              to={`/learning?track=${track.domain}`}
            >
              <span className="atlas-direction-number" aria-hidden="true">
                0{index + 1}
              </span>
              <span className="atlas-direction-copy">
                <strong>{t(track.title, track.en, track.titleTw)}</strong>
                <small className="atlas-direction-detail">
                  {t(...(track.entryDescription as [string, string, string]))}
                </small>
                <span className="atlas-classic-route-label">
                  {t("看路线", "View path", "看路線")} ↗
                </span>
              </span>
            </Link>
          </Fragment>
        ))}
      </div>
      <Link className="atlas-all-directions" to="/learning">
        {t("完整学习路线", "All learning paths", "完整學習路線")} ↗
      </Link>
    </section>
  );
}
