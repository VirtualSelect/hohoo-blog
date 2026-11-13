export const readingFilterOptions = {
  status: ["inbox", "reading", "done", "all"],
  type: ["all", "radar", "paper", "learning", "note"],
  sort: ["newest", "oldest", "shortest"],
};
export const defaultReadingFilters = {
  status: "inbox",
  type: "all",
  topic: "all",
  sort: "newest",
};

export function readReadingFilters(search = "", topics = []) {
  const params = new URLSearchParams(search);
  const options = { ...readingFilterOptions, topic: ["all", ...topics] };
  return Object.fromEntries(
    Object.entries(defaultReadingFilters).map(([key, fallback]) => {
      const value = params.get(key);
      return [key, options[key].includes(value) ? value : fallback];
    }),
  );
}

export function readingFilterUrl(href, filters, topics = []) {
  const url = new URL(href);
  const normalized = readReadingFilters(new URLSearchParams(filters), topics);
  for (const [key, fallback] of Object.entries(defaultReadingFilters)) {
    if (normalized[key] === fallback) url.searchParams.delete(key);
    else url.searchParams.set(key, normalized[key]);
  }
  return url.pathname + url.search + url.hash;
}

// Resolve saved learning steps against the localized content index.
export function savedLearningEntries(
  tracks,
  entries,
  learning,
  locale = "zh-CN",
) {
  const byStep = new Map(
    entries.filter((e) => e.stepId).map((e) => [e.stepId, e]),
  );
  return tracks.flatMap((track) =>
    track.steps
      .filter((step) => learning.saved.includes(step.id))
      .map((step) => {
        const article = byStep.get(step.id);
        const savedAt = learning.savedAt?.[step.id];
        const plannedTitle =
          locale === "en"
            ? step.en
            : locale === "zh-TW"
              ? step.titleTw || step.title
              : step.title;
        return {
          id: step.id,
          type: "learning",
          topic: track.domain,
          title: article?.title || plannedTitle || step.doc || step.id,
          href: article?.href || `/learning#step-${step.id}`,
          minutes: article?.minutes,
          savedAt:
            typeof savedAt === "string" && Number.isFinite(Date.parse(savedAt))
              ? savedAt
              : undefined,
          planned: !article,
          stage:
            learning.items[step.id]?.status === "completed"
              ? "done"
              : learning.items[step.id]?.status === "reading"
                ? "reading"
                : "inbox",
        };
      }),
  );
}

export function compareReadingEntries(
  a,
  b,
  order = "newest",
  locale = "zh-CN",
) {
  const byTitle = () =>
    String(a.title || a.id || "").localeCompare(
      String(b.title || b.id || ""),
      locale,
    );
  if (order === "shortest") {
    const duration = (entry) =>
      Number.isFinite(entry.minutes) && entry.minutes > 0
        ? entry.minutes
        : Infinity;
    return duration(a) - duration(b) || byTitle();
  }
  const time = (entry) => {
    const value =
      typeof entry.savedAt === "string" ? Date.parse(entry.savedAt) : NaN;
    return Number.isFinite(value) ? value : null;
  };
  const left = time(a),
    right = time(b);
  if (left === null || right === null)
    return left !== null ? -1 : right !== null ? 1 : byTitle();
  return (order === "oldest" ? left - right : right - left) || byTitle();
}
