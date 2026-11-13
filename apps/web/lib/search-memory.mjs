const locales = new Set(["zh-CN", "zh-TW", "en"]);
const empty = () => ({ query: "", mode: "titles" });

// One locale-scoped current draft, never a history of queries or cached excerpts.
export function createSearchMemory() {
  let current = null;
  return {
    read(locale) {
      return current?.locale === locale
        ? { query: current.query, mode: current.mode }
        : empty();
    },
    remember(locale, draft) {
      if (
        !locales.has(locale) ||
        !draft ||
        typeof draft.query !== "string" ||
        draft.query.length > 180 ||
        !["titles", "passages"].includes(draft.mode)
      )
        return false;
      current = draft.query.trim()
        ? { locale, query: draft.query, mode: draft.mode }
        : null;
      return true;
    },
  };
}

// Allocate only in the browser; SSR must never retain request-specific state.
let memory;
function browserMemory() {
  if (typeof window === "undefined") return null;
  return (memory ||= createSearchMemory());
}
export function readSearchDraft(locale) {
  return browserMemory()?.read(locale) || empty();
}
export function rememberSearchDraft(locale, draft) {
  return browserMemory()?.remember(locale, draft) || false;
}
