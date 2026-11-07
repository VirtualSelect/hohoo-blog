"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import topics from "@site/data/topics";
import type { ContentEntry, Domain } from "../lib/site-types";

export default function ResearchIndex({
  entries,
  destination = "learning",
  onSelect,
  selected = "all",
  compact = false,
}: {
  entries: ContentEntry[];
  destination?: "learning" | "articles";
  onSelect?: (domain: Domain | "all") => void;
  selected?: Domain | "all";
  compact?: boolean;
}) {
  const t = useText();
  const Container = onSelect ? "div" : "nav";
  return (
    <section className="research-directory">
      {onSelect && !compact && (
        <div className="research-directory-heading">
          <span>
            {t(
              "按研究方向找文章",
              "Browse a research track",
              "依研究方向找文章",
            )}
          </span>
          <button
            type="button"
            aria-pressed={selected === "all"}
            onClick={() => onSelect("all")}
          >
            {t("全部方向", "All tracks", "全部方向")} ↗
          </button>
        </div>
      )}
      <Container
        className={
          compact ? "research-index research-index-compact" : "research-index"
        }
        role={onSelect ? "group" : undefined}
        aria-label={t("四个研究方向", "Four research tracks", "四個研究方向")}
      >
        {compact && onSelect && (
          <button
            type="button"
            aria-pressed={selected === "all"}
            onClick={() => onSelect("all")}
          >
            {t("全部方向", "All tracks", "全部方向")}
          </button>
        )}
        {topics.map((topic, i) => {
          const count = entries.filter(
            (e) =>
              e.type === "doc" &&
              e.domain === topic.id &&
              e.status === "published",
          ).length;
          const content = (
            <>
              <span className="research-index-number" aria-hidden="true">
                0{i + 1}
              </span>
              <strong>{t(topic.title, topic.en, topic.titleTw)}</strong>
              <span className="research-index-description">
                {t(topic.description, topic.english, topic.descriptionTw)}
              </span>
              <small>
                {count}{" "}
                {!compact &&
                  t(
                    "篇实践文章",
                    count === 1 ? "practice article" : "practice articles",
                    "篇實作文章",
                  )}{" "}
                {!compact && <span aria-hidden="true">↗</span>}
              </small>
            </>
          );
          return onSelect ? (
            <button
              key={topic.id}
              type="button"
              data-domain={topic.id}
              aria-pressed={selected === topic.id}
              onClick={() => onSelect(topic.id as Domain)}
            >
              {content}
            </button>
          ) : (
            <Link
              key={topic.id}
              data-domain={topic.id}
              to={
                destination === "learning"
                  ? `/learning#track-${topic.id}`
                  : `/articles?domain=${topic.id}`
              }
            >
              {content}
            </Link>
          );
        })}
      </Container>
    </section>
  );
}
