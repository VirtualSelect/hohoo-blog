export function readRadarFilters(search, domains, sources) {
  const params = new URLSearchParams(search);
  return {
    query: params.get("q") || "",
    domain: domains.includes(params.get("domain"))
      ? params.get("domain")
      : "all",
    source: sources.includes(params.get("source"))
      ? params.get("source")
      : "all",
  };
}

export function filterRadarItems(items, { query, domain, source }) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const text = [item.title, item.summary, item.searchText, item.sourceName]
      .join(" ")
      .toLowerCase();
    return (
      (domain === "all" || item.domain === domain) &&
      (source === "all" || item.sourceId === source) &&
      words.every((word) => text.includes(word))
    );
  });
}

export function radarFilterUrl(href, filters) {
  const url = new URL(href);
  for (const [key, value] of [
    ["q", filters.query],
    ["domain", filters.domain],
    ["source", filters.source],
  ]) {
    if (value && (key === "q" || value !== "all"))
      url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  // An explicitly changed filter starts a new result set.
  url.hash = "";
  return url.pathname + url.search;
}
