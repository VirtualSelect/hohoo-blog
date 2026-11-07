export const rssTextFormat = "aihot-rss-text-v1";

export function sourceArticleUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function validFeedContent(value) {
  return Boolean(
    value &&
      value.format === rssTextFormat &&
      typeof value.language === "string" &&
      /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value.language) &&
      Number.isFinite(Date.parse(value.capturedAt)) &&
      Array.isArray(value.paragraphs) &&
      value.paragraphs.length > 0 &&
      value.paragraphs.length <= 160 &&
      value.paragraphs.every((p) => typeof p === "string" && p.trim()) &&
      value.paragraphs.reduce((n, p) => n + p.length, 0) <= 60000,
  );
}

// Refresh an existing record's RSS text without inventing a new intake date.
// A brief-feed fallback has no full-feed status and cannot revoke a cached body.
export function mergeFeedContent(published, candidates) {
  const byId = new Map(candidates.map((item) => [item.id, item]));
  return published.map((item) => {
    const candidate = byId.get(item.id);
    if (
      item.sourceId !== "aihot" ||
      candidate?.sourceId !== "aihot" ||
      candidate.url !== item.url
    )
      return item;
    const next = { ...item };
    const original = sourceArticleUrl(candidate.sourceArticleUrl);
    if (original) next.sourceArticleUrl = original;
    if (candidate.feedContentStatus === "summary-only") {
      next.feedContentStatus = "summary-only";
      delete next.feedContent;
    } else if (validFeedContent(candidate.feedContent)) {
      next.feedContentStatus = "full";
      const previous = item.feedContent;
      const unchanged =
        previous?.language === candidate.feedContent.language &&
        JSON.stringify(previous?.paragraphs) ===
          JSON.stringify(candidate.feedContent.paragraphs);
      next.feedContent = unchanged ? previous : candidate.feedContent;
    }
    return next;
  });
}
