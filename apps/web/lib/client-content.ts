import type { ContentEntry, GlobalData, Locale, Messages } from "./site-types";

// Translator notes belong in source files, not in every HTML/Flight payload.
export function clientMessages(messages: Messages): Messages {
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [
      key,
      value ? { message: value.message } : value,
    ]),
  );
}

// Detail bodies are needed only on their own route. Keep all discovery,
// relationship and filtering metadata in the shared index.
const detailFields = new Set([
  "localization",
  // Summaries already have locale-resolved title/description. These are read
  // only by the complete detail view, which is retained below.
  "titleTw",
  "descriptionTw",
  "itemIds",
  "resources",
  "sections",
  "design",
  "experimentLog",
  "architecture",
  "goalZh",
  "goalEn",
  "goalTw",
  "method",
  "methodEn",
  "methodTw",
  "result",
  "resultEn",
  "resultTw",
  "observations",
  "observationsEn",
  "observationsTw",
  "conclusion",
  "conclusionEn",
  "conclusionTw",
  "limitations",
  "limitationsEn",
  "limitationsTw",
  "reproduce",
  "reproduceEn",
  "reproduceTw",
  "zh",
  "en",
]);

export function clientGlobalData(
  data: GlobalData,
  locale: Locale,
  route: string,
): GlobalData {
  const href = (locale === "zh-CN" ? "" : "/" + locale) + "/" + route;
  const index = data["content-index"];
  const entries = index.entries.map(
    (entry): ContentEntry =>
      entry.href === href
        ? entry
        : (Object.fromEntries(
            Object.entries(entry).filter(([key]) => !detailFields.has(key)),
          ) as unknown as ContentEntry),
  );
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    ...data,
    "content-index": {
      entries,
      // Preserve order and reuse references so React Flight serializes each
      // entry once instead of duplicating the entire activity index per page.
      activity: index.activity.map((entry) => byId.get(entry.id) || entry),
    },
  };
}
