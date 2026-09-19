export function readingForks(entries, currentId, metadata = {}) {
  const ids = [...(metadata.related || []), ...(metadata.prerequisites || [])];
  const available = entries.filter(
    (e) =>
      e.id !== currentId &&
      e.href &&
      !e.unlisted &&
      e.translationStatus !== "MISSING",
  );
  const linked = available.filter((e) => ids.includes(e.id));
  return {
    concepts: linked.filter(
      (e) =>
        ["note", "doc", "glossary"].includes(e.type) &&
        e.status === "published",
    ),
    practice: linked.filter(
      (e) =>
        (e.type === "project" &&
          ["building", "production", "experiment"].includes(e.status)) ||
        (e.type === "lab" && e.status === "completed"),
    ),
    deeper: available
      .filter(
        (e) =>
          ["doc", "blog", "paper", "note"].includes(e.type) &&
          e.status === "published" &&
          metadata.domain &&
          e.domain === metadata.domain,
      )
      .slice(0, 3),
  };
}
