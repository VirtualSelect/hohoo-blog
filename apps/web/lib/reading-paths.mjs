export function coreSteps(track) {
  const byId = new Map(
    track.steps.filter((step) => step.doc).map((step) => [step.id, step]),
  );
  return (track.chapters || []).flatMap((chapter) =>
    chapter.steps.map((id) => byId.get(id)).filter(Boolean),
  );
}

export function readLearningFilters(search = "") {
  const params = new URLSearchParams(search);
  const difficulty = params.get("difficulty");
  return {
    query: params.get("q") || "",
    difficulty: ["beginner", "intermediate", "advanced"].includes(difficulty)
      ? difficulty
      : "all",
    saved: params.get("saved") === "1",
  };
}

export function learningFilterUrl(href, { query, difficulty, saved }) {
  const url = new URL(href);
  for (const [key, value] of [
    ["q", query],
    ["difficulty", difficulty === "all" ? "" : difficulty],
    ["saved", saved ? "1" : ""],
  ]) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  // A changed filter can hide the old target. Do not keep a misleading anchor.
  return url.pathname + url.search;
}

export function readingGroups(track, available, matches = () => true) {
  const core = new Set(coreSteps(track).map((step) => step.id));
  const visible = track.steps.filter(matches);
  return {
    chapters: (track.chapters || [])
      .map((chapter, index) => ({
        ...chapter,
        index,
        steps: chapter.steps
          .map((id) => visible.find((step) => step.id === id))
          .filter((step) => step && available.has(step.id)),
      }))
      .filter((chapter) => chapter.steps.length),
    studies: visible.filter(
      (step) => available.has(step.id) && !core.has(step.id),
    ),
    plans: visible.filter((step) => !available.has(step.id)),
  };
}

// The short route is a reading recommendation, never a replacement for prerequisites.
export function nextReadingStep(track, id, available) {
  if (!track) return null;
  const main = coreSteps(track).filter((step) => available.has(step.id));
  const index = main.findIndex((step) => step.id === id);
  if (index >= 0) return main[index + 1] || null;
  const step = track.steps.find((item) => item.id === id);
  return (
    (step?.followUps || [])
      .map((doc) =>
        track.steps.find(
          (item) => `doc:${item.doc}` === doc && available.has(item.id),
        ),
      )
      .find(Boolean) || null
  );
}
