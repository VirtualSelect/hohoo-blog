// Hand-authored teaching values, not embedding scores or measured retrieval quality.
export const teachingScores = {
  A: [0.6, 0.95],
  B: [0.8, 0.3],
  C: [1, 0.5],
  D: [0.1, 0.1],
};
export function rankTeachingDocs(weight) {
  const w = Math.max(0, Math.min(100, weight)) / 100;
  return Object.entries(teachingScores)
    .map(([id, [keyword, semantic]]) => ({
      id,
      keyword,
      semantic,
      score: w * keyword + (1 - w) * semantic,
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
