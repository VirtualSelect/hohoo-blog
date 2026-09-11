export const learningKey = 'huhohoo.learning.v1';
export const legacyLearningKey = 'hohoo-learning-v1';
export const emptyProgress = () => ({ version: 1, items: {}, saved: [] });
export function parseProgress(raw, validIds) {
  let value;
  try {
    value = JSON.parse(raw || 'null');
  } catch {
    return emptyProgress();
  }
  if (!value || value.version !== 1) return emptyProgress();
  const ids = new Set(validIds);
  const state = emptyProgress();
  state.saved = [
    ...new Set(
      Array.isArray(value.saved) ? value.saved.filter((id) => ids.has(id)) : [],
    ),
  ];
  for (const [id, item] of Object.entries(value.items || {}))
    if (ids.has(id) && ['reading', 'completed'].includes(item?.status))
      state.items[id] = {
        status: item.status,
        ...(typeof item.updatedAt === 'string' &&
        Number.isFinite(Date.parse(item.updatedAt))
          ? { updatedAt: item.updatedAt }
          : {}),
      };
  if (ids.has(value.lastOpened) && state.items[value.lastOpened])
    state.lastOpened = value.lastOpened;
  return state;
}
export function migrateProgress(raw, validIds) {
  let value;
  try {
    value = JSON.parse(raw || 'null');
  } catch {
    return emptyProgress();
  }
  if (!value) return emptyProgress();
  const ids = new Set(validIds),
    state = emptyProgress();
  state.saved = [
    ...new Set(
      Array.isArray(value.saved) ? value.saved.filter((id) => ids.has(id)) : [],
    ),
  ];
  for (const id of Array.isArray(value.completed) ? value.completed : [])
    if (ids.has(id)) state.items[id] = { status: 'completed' };
  return state;
}
export function updateProgress(
  state,
  id,
  action,
  now = new Date().toISOString(),
) {
  if (action === 'saved')
    return {
      ...state,
      saved: state.saved.includes(id)
        ? state.saved.filter((v) => v !== id)
        : [...state.saved, id],
    };
  if (!['reading', 'completed'].includes(action)) return state;
  return {
    ...state,
    lastOpened: id,
    items: { ...state.items, [id]: { status: action, updatedAt: now } },
  };
}
export const learningSymbols = {
  'not-started': '○',
  reading: '◐',
  completed: '✓',
  saved: '☆',
};
