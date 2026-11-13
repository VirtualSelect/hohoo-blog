export const learningKey = "huhohoo.learning.v1";
export const legacyLearningKey = "hohoo-learning-v1";
export type LearningStatus = "reading" | "completed";
export type LearningAction = LearningStatus | "saved";
export interface LearningProgress {
  version: 1;
  items: Record<string, { status: LearningStatus; updatedAt?: string }>;
  saved: string[];
  savedAt?: Record<string, string>;
  lastOpened?: string;
}
export const emptyProgress = (): LearningProgress => ({
  version: 1,
  items: {},
  saved: [],
});
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parse(raw: string | null): unknown {
  try {
    return JSON.parse(raw || "null");
  } catch {
    return null;
  }
}
function validList(value: unknown, ids: Set<string>): string[] {
  return [
    ...new Set(
      Array.isArray(value)
        ? value.filter(
            (id): id is string => typeof id === "string" && ids.has(id),
          )
        : [],
    ),
  ];
}
export function parseProgress(
  raw: string | null,
  validIds: readonly string[],
): LearningProgress {
  const value = parse(raw);
  if (!record(value) || value.version !== 1) return emptyProgress();
  const ids = new Set(validIds);
  const state = emptyProgress();
  state.saved = validList(value.saved, ids);
  if (record(value.savedAt)) {
    const dates = value.savedAt;
    const savedAt: Record<string, string> = {};
    for (const id of state.saved) {
      const date = dates[id];
      if (typeof date === "string" && Number.isFinite(Date.parse(date)))
        savedAt[id] = date;
    }
    if (Object.keys(savedAt).length) state.savedAt = savedAt;
  }
  for (const [id, item] of Object.entries(
    record(value.items) ? value.items : {},
  )) {
    if (
      ids.has(id) &&
      record(item) &&
      (item.status === "reading" || item.status === "completed")
    )
      state.items[id] = {
        status: item.status,
        ...(typeof item.updatedAt === "string" &&
        Number.isFinite(Date.parse(item.updatedAt))
          ? { updatedAt: item.updatedAt }
          : {}),
      };
  }
  if (
    typeof value.lastOpened === "string" &&
    ids.has(value.lastOpened) &&
    state.items[value.lastOpened]
  )
    state.lastOpened = value.lastOpened;
  return state;
}
export function migrateProgress(
  raw: string | null,
  validIds: readonly string[],
): LearningProgress {
  const value = parse(raw);
  if (!record(value)) return emptyProgress();
  const ids = new Set(validIds),
    state = emptyProgress();
  state.saved = validList(value.saved, ids);
  for (const id of validList(value.completed, ids))
    state.items[id] = { status: "completed" };
  return state;
}
export function updateProgress(
  state: LearningProgress,
  id: string,
  action: LearningAction,
  now = new Date().toISOString(),
): LearningProgress {
  if (action === "saved") {
    const result: LearningProgress = {
      ...state,
      saved: state.saved.includes(id)
        ? state.saved.filter((v) => v !== id)
        : [...state.saved, id],
    };
    const savedAt = { ...state.savedAt };
    if (
      result.saved.includes(id) &&
      typeof now === "string" &&
      Number.isFinite(Date.parse(now))
    )
      savedAt[id] = now;
    else delete savedAt[id];
    if (Object.keys(savedAt).length) result.savedAt = savedAt;
    else delete result.savedAt;
    return result;
  }
  // Keep the runtime guard: JavaScript consumers and persisted data are untyped.
  if (action !== "reading" && action !== "completed") return state;
  return {
    ...state,
    lastOpened: id,
    items: { ...state.items, [id]: { status: action, updatedAt: now } },
  };
}
export const learningSymbols = {
  "not-started": "○",
  reading: "◐",
  completed: "✓",
  saved: "☆",
} as const;
