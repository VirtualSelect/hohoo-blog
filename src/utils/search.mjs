export function searchEntries(entries, query) {
  const types = [],
    topics = [];
  const text = query
    .toLowerCase()
    .replace(/\b(type|topic):([\w-]+)/g, (_, key, value) => {
      (key === 'type' ? types : topics).push(
        value === 'embodied' ? 'embodied-ai' : value,
      );
      return '';
    })
    .trim();
  const words = text.split(/\s+/).filter(Boolean);
  return entries
    .filter(
      (e) =>
        (!types.length || types.includes(e.type)) &&
        (!topics.length || topics.includes(e.topic)) &&
        words.every((w) =>
          [e.title, e.description, ...(e.tags || [])]
            .join(' ')
            .toLowerCase()
            .includes(w),
        ),
    )
    .slice(0, 40);
}
export function searchGroup(type) {
  return ['project', 'lab'].includes(type)
    ? 'BUILD'
    : ['radar', 'radar-digest'].includes(type)
      ? 'DISCOVER'
      : type === 'blog'
        ? 'SHARE'
        : 'KNOWLEDGE';
}
