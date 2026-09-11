export const readingKey = 'hohoo-news-reading-v1';
export function parseReadingState(raw) {
  const value = JSON.parse(raw || '{}');
  const ids = list => [...new Set(Array.isArray(list) ? list.filter(id => typeof id === 'string' && /^[a-f0-9]{20}$/.test(id)) : [])];
  return {saved:ids(value?.saved),read:ids(value?.read)};
}
export function toggleReadingState(state, field, id) {
  if (!['saved','read'].includes(field) || !/^[a-f0-9]{20}$/.test(id)) return state;
  return {...state,[field]:state[field].includes(id) ? state[field].filter(value=>value!==id) : [...state[field],id]};
}
