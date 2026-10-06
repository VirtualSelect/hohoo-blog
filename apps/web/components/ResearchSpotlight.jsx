"use client";
import Link from "../runtime/Link";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import editorial from "@site/data/editorial.json";
import { uiLabel } from "@site/src/utils/ui-labels";
import WritingKind from "@site/src/components/WritingKind";
import s from "./ResearchEvidence.module.css";

export default function ResearchSpotlight() {
  const { globalData } = useSite();
  const t = useText();
  return (
    <aside
      className={s.spotlight}
      aria-label={t("最近的实践", "Recent practice", "最近的實作")}
    >
      <p className="eyebrow">
        {t("从代码与证据出发", "From code and evidence", "從程式碼與證據出發")}
      </p>
      {editorial.featuredArticles.map((id, i) => {
        const entry = globalData["content-index"].entries.find(
          (e) => e.id === id,
        );
        if (!entry) return null;
        const media = editorial.featuredMedia?.[id];
        return (
          <Link key={id} to={entry.href} className={s.feature}>
            <span className="eyebrow">
              0{i + 1} / {uiLabel(entry.domain)} · <WritingKind entry={entry} />
            </span>
            {media && (
              <img
                src={media.src}
                alt={t(media.alt, media.altEn, media.altTw)}
                width={media.width}
                height={media.height}
              />
            )}
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
            <span>
              {t("查看过程与证据", "Explore the evidence", "查看過程與證據")} ↗
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
