export function canonicalPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return null;
  return (
    value
      .split(/[?#]/)[0]
      .replace(/^\/(en|zh-TW|zh-CN)(?=\/|$)/, "")
      .replace(/\/+$/, "") || "/"
  );
}

export function redactVisit(event) {
  try {
    const url = new URL(event.url);
    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export function publicPaths(rows, allowed) {
  if (!Array.isArray(rows)) throw new Error("Invalid analytics rows");
  const result = {};
  for (const row of rows) {
    const path = canonicalPath(row.requestPath);
    if (!path || !allowed.has(path)) continue;
    if (!Number.isSafeInteger(row.pageviews) || row.pageviews < 0)
      throw new Error("Invalid pageviews");
    result[path] = (result[path] || 0) + row.pageviews;
  }
  return result;
}

export function publicCountries(rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid countries");
  return rows
    .filter(
      (row) =>
        /^[A-Z]{2}$/.test(row.country) &&
        Number.isSafeInteger(row.visitors) &&
        row.visitors >= 3,
    )
    .map(({ country, visitors }) => ({ country, visitors }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 8);
}
