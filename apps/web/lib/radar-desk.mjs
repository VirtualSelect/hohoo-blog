import {
  readRadarFilters,
  filterRadarItems,
  radarFilterUrl,
} from "./radar-filters.mjs";

export function readRadarDesk(search, domains, sources) {
  const params = new URLSearchParams(search);
  return {
    ...readRadarFilters(search, domains, sources),
    inbox: ["unread", "saved"].includes(params.get("inbox"))
      ? params.get("inbox")
      : "all",
    order: params.get("order") === "oldest" ? "oldest" : "latest",
  };
}
export function deskSignals(items, filters, reading) {
  const read = new Set(reading.read),
    saved = new Set(reading.saved);
  const selected = filterRadarItems(items, filters).filter((item) =>
    filters.inbox === "saved"
      ? saved.has(item.id)
      : filters.inbox === "unread"
        ? !read.has(item.id)
        : true,
  );
  return filters.order === "oldest" ? [...selected].reverse() : selected;
}
export function radarDeskUrl(href, filters) {
  const url = new URL(radarFilterUrl(href, filters), href);
  for (const [key, value] of [
    ["inbox", filters.inbox],
    ["order", filters.order],
  ]) {
    if (value && value !== "all" && value !== "latest")
      url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return url.pathname + url.search;
}
export function signalFromHash(hash) {
  return /^#signal-([a-f0-9]{20})$/.exec(hash)?.[1] || null;
}
