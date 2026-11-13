export function readCompletionCase(search, cases, fallback) {
  const id = new URLSearchParams(search).get("completion");
  return cases.some((item) => item.id === id) ? id : fallback;
}
export function completionViewUrl(base, id, cases) {
  if (!cases.some((item) => item.id === id))
    throw Error("Unknown completion case");
  const url = new URL(base);
  url.searchParams.set("completion", id);
  url.hash = "embodied-guide";
  return url.pathname + url.search + url.hash;
}
