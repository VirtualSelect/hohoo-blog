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
  if (!a.savedAt || !b.savedAt)
    return a.savedAt ? -1 : b.savedAt ? 1 : byTitle();
  return (
    (order === "oldest"
      ? a.savedAt.localeCompare(b.savedAt)
      : b.savedAt.localeCompare(a.savedAt)) || byTitle()
  );
}
