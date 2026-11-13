import Link from "../runtime/Link";
import { useText } from "./Shell";
import type { ContentEntry, Domain } from "../lib/site-types";

interface Direction {
  domain: Domain;
  title: string;
  description: string;
  article?: ContentEntry;
}
interface SelectionProps {
  directions: Direction[];
  domain: Domain | "all";
  onSelect: (domain: Domain) => void;
}

export function PhotoIntroduction({ description }: { description: string }) {
  const t = useText();
  return (
    <aside
      className="concept-photo-intro"
      aria-label={t("关于作者", "About the author", "關於作者")}
    >
      <span className="concept-photo-rule" aria-hidden="true" />
      <h2>Hohoo.</h2>
      <p>{description}</p>
      <Link to="/about">{t("关于我", "About me", "關於我")} →</Link>
    </aside>
  );
}

// Every edge means this site's explicit track-to-entry relationship.
// It does not assert a prerequisite or an inferred relationship between articles.
export function KnowledgeRelations({
  directions,
  domain,
  onSelect,
}: SelectionProps) {
  const t = useText();
  const branches = [
    "M300 210C220 210 190 92 140 92",
    "M300 210C380 210 410 92 460 92",
    "M300 210C220 210 190 328 140 328",
    "M300 210C380 210 410 328 460 328",
  ];
  return (
    <section
      className="concept-map-relations"
      aria-labelledby="concept-map-heading"
    >
      <header>
        <h2 id="concept-map-heading">
          {t("知识地图", "Knowledge map", "知識地圖")}
        </h2>
        <p>
          {t(
            "研究方向 → 已发表入口文章",
            "Research tracks → published entry articles",
            "研究方向 → 已發表入口文章",
          )}
        </p>
      </header>
      <div className="concept-map-canvas">
        <svg
          viewBox="0 0 600 420"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {directions.map(
            (direction, index) =>
              branches[index] && (
                <path
                  key={direction.domain}
                  d={branches[index]}
                  className={domain === direction.domain ? "selected" : ""}
                />
              ),
          )}
        </svg>
        <span className="concept-map-root">
          Hohoo’s
          <br />
          AI Lab
        </span>
        <div className="concept-map-nodes">
          {directions.map((direction, index) => (
            <article
              key={direction.domain}
              className="concept-map-relation"
              data-selected={domain === direction.domain}
            >
              <button
                type="button"
                onClick={() => onSelect(direction.domain)}
                aria-pressed={domain === direction.domain}
                aria-controls="atlas-feature"
              >
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {direction.title}
              </button>
              <p className="concept-map-mobile-description">
                {direction.description}
              </p>
              {direction.article ? (
                <Link to={direction.article.href}>
                  {direction.article.title} <span aria-hidden="true">↗</span>
                </Link>
              ) : (
                <p>
                  {t(
                    "入口文章正在整理中。",
                    "An entry article is being prepared.",
                    "入口文章正在整理中。",
                  )}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChapterTabs({ directions, domain, onSelect }: SelectionProps) {
  const t = useText();
  return (
    <div
      className="concept-chapter-tabs"
      role="group"
      aria-label={t("选择阅读章节", "Choose a reading chapter", "選擇閱讀章節")}
    >
      {directions.map((direction, index) => (
        <button
          type="button"
          key={direction.domain}
          aria-pressed={domain === direction.domain}
          aria-controls="atlas-feature"
          onClick={() => onSelect(direction.domain)}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <strong>{direction.title}</strong>
        </button>
      ))}
    </div>
  );
}
