import {
  parseReadingState,
  readingKey as legacyKey,
} from './reading-state.mjs';
export { legacyKey };
export const readingKey = 'huhohoo.reading.v2';
const valid = (id) =>
  typeof id === 'string' &&
  /^(?:[a-f0-9]{20}|(?:paper|note):[\w.-]+)$/.test(id);
export const emptyInbox = () => ({
  version: 2,
  saved: [],
  read: [],
  reading: [],
  savedAt: {},
});
export function parseInbox(raw, legacy) {
  if (raw === null) {
    const old = parseReadingState(legacy);
    return { ...emptyInbox(), ...old };
  }
  const v = JSON.parse(raw || 'null');
  if (v?.version !== 2) return emptyInbox();
  const clean = (list) => [
    ...new Set(Array.isArray(list) ? list.filter(valid) : []),
  ];
  const saved = clean(v.saved),
    read = clean(v.read),
    reading = clean(v.reading).filter((id) => !read.includes(id));
  const savedAt = {};
  for (const id of saved) {
    if (
      typeof v.savedAt?.[id] === 'string' &&
      Number.isFinite(Date.parse(v.savedAt[id]))
    )
      savedAt[id] = v.savedAt[id];
  }
  return { version: 2, saved, read, reading, savedAt };
}
export function toggleInbox(state, field, id, now = new Date().toISOString()) {
  if (!valid(id) || !['saved', 'read', 'reading'].includes(field)) return state;
  const result = {
    ...state,
    [field]: state[field].includes(id)
      ? state[field].filter((x) => x !== id)
      : [...state[field], id],
    savedAt: { ...state.savedAt },
  };
  if (field === 'saved') {
    if (result.saved.includes(id)) result.savedAt[id] = now;
    else delete result.savedAt[id];
  }
  if (field === 'read') result.reading = result.reading.filter((x) => x !== id);
  if (field === 'reading') result.read = result.read.filter((x) => x !== id);
  return result;
}
