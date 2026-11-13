// Local lexical retrieval. Scores rank passages; they are not confidence values.
const stopWords = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "of",
  "to",
  "in",
  "and",
  "how",
  "why",
  "what",
  "does",
  "can",
]);
export function searchTerms(query) {
  const normalized = String(query).normalize("NFKC").toLowerCase();
  const terms = [];
  for (const word of normalized.match(/[\p{Script=Han}]+|[a-z0-9]+/gu) || []) {
    if (stopWords.has(word)) continue;
    if (/\p{Script=Han}/u.test(word)) {
      const chars = [...word];
      if (chars.length === 1) terms.push(word);
      else
        for (let i = 0; i < chars.length - 1; i++)
          terms.push(chars[i] + chars[i + 1]);
    } else terms.push(word);
  }
  return terms;
}

export function createSectionSearcher(passages) {
  const frequencies = new Map();
  const records = passages.map((passage) => {
    const terms = searchTerms(passage.heading + " " + passage.text);
    const counts = new Map();
    for (const term of terms) counts.set(term, (counts.get(term) || 0) + 1);
    const titleTerms = new Set(searchTerms(passage.title));
    for (const term of titleTerms)
      counts.set(term, (counts.get(term) || 0) + 0.2);
    for (const term of counts.keys())
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
    return { passage, counts, length: terms.length, titleTerms };
  });
  const average =
    records.reduce((sum, record) => sum + record.length, 0) /
    (records.length || 1);
  return function search(query, limit = 12) {
    const types = [],
      topics = [];
    const text = query
      .replace(/\b(type|topic):([\w-]+)/gi, (_, key, value) => {
        (key.toLowerCase() === "type" ? types : topics).push(
          value.toLowerCase() === "embodied"
            ? "embodied-ai"
            : value.toLowerCase(),
        );
        return "";
      })
      .trim();
    const terms = [...new Set(searchTerms(text))];
    if (!terms.length) return [];
    const ranked = [];
    for (const { passage, counts, length, titleTerms } of records) {
      if (types.length && !types.includes(passage.type)) continue;
      if (topics.length && !topics.includes(passage.topic)) continue;
      let score = 0,
        matched = 0,
        bodyMatched = 0;
      for (const term of terms) {
        const tf = counts.get(term) || 0;
        if (!tf) continue;
        if (tf > 0.2) bodyMatched++;
        matched++;
        const df = frequencies.get(term) || 0;
        const idf = Math.log(1 + (records.length - df + 0.5) / (df + 0.5));
        score +=
          (idf * (tf * 2.2)) /
          (tf + 1.2 * (0.25 + (0.75 * length) / (average || 1)));
      }
      if (
        !bodyMatched ||
        matched < Math.min(2, terms.length) ||
        matched / terms.length < 0.2
      )
        continue;
      score *=
        1 + terms.filter((term) => titleTerms.has(term)).length / terms.length;
      if (
        (passage.heading + " " + passage.text)
          .toLowerCase()
          .includes(text.toLowerCase())
      )
        score *= 1.5;
      ranked.push({ ...passage, score });
    }
    ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const perDocument = new Map();
    return ranked
      .filter((result) => {
        const count = perDocument.get(result.documentId) || 0;
        perDocument.set(result.documentId, count + 1);
        return count < 2;
      })
      .slice(0, limit);
  };
}

export function passageExcerpt(text, query, length = 240) {
  const terms = searchTerms(query.replace(/\b(type|topic):[\w-]+/gi, ""));
  const lower = text.toLowerCase();
  const positions = terms
    .map((term) => lower.indexOf(term))
    .filter((position) => position >= 0);
  const start = Math.max(
    0,
    (positions.length ? Math.min(...positions) : 0) - 45,
  );
  return (
    (start ? "…" : "") +
    text.slice(start, start + length) +
    (start + length < text.length ? "…" : "")
  );
}
