import type { ContentEntry, GlobalData, Locale, Messages } from "./site-types";
import type { ClientDocument, RadarSignal } from "./site-types";
import { writingEntries } from "../../../src/utils/localization.cjs";
import { readingForks } from "./reading-forks.mjs";
import tracks from "../../../data/learning-paths.json" with { type: "json" };
import { isoWeek } from "../../../src/utils/radar.cjs";

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

// Keep exactly the article's discovery links. Search loads its full index on
// demand; serializing that catalogue again into every article is unnecessary.
export function pageGlobalData(
  data: GlobalData,
  locale: Locale,
  route: string,
  document: ClientDocument | null,
): GlobalData {
  const compact = clientGlobalData(data, locale, route);
  const entries = compact["content-index"].entries;
  const href = (locale === "zh-CN" ? "" : "/" + locale) + "/" + route;
  const detail =
    !document &&
    entries.find(
      (entry) =>
        entry.href === href &&
        ["lab", "project", "note", "paper"].includes(entry.type),
    );
  if ((!document && !detail) || document?.frontMatter.landing) return compact;
  const selected = new Set<string>(
    writingEntries(entries)
      .slice(0, 3)
      .map((e: ContentEntry) => e.id),
  );
  const article = document && ["docs", "blog"].includes(document.kind);
  if (detail) {
    selected.add(detail.id);
    for (const id of [
      ...(detail.related || []),
      ...(detail.prerequisites || []),
    ])
      selected.add(id);
  }
  if (article && document) {
    const id =
      (document.kind === "blog" ? "blog:" : "doc:") + document.metadata.id;
    selected.add(id);
    for (const linked of [
      ...(document.frontMatter.related || []),
      ...(document.frontMatter.prerequisites || []),
    ])
      selected.add(linked);
    const forks = readingForks(entries, id, document.frontMatter);
    for (const entry of Object.values(forks).flat() as ContentEntry[])
      selected.add(entry.id);
    const step = tracks
      .flatMap<(typeof tracks)[number]["steps"][number]>((track) => track.steps)
      .find((step) => step.id === document.frontMatter.learning_step);
    for (const id of step?.followUps || []) selected.add(id);
  }
  return {
    "content-index": {
      entries: entries.filter((e) => selected.has(e.id)),
      activity: [],
    },
    "learning-index": article ? compact["learning-index"] : { entries: [] },
    "radar-pages": { preview: [] },
  };
}

export function pageSignals(
  items: RadarSignal[],
  route: string,
): RadarSignal[] {
  if (route.startsWith("radar/weekly/"))
    return items.filter(
      (item) => isoWeek(item.publishedAt) === route.split("/").pop(),
    );
  if (route.startsWith("news/daily/"))
    return items.filter((item) =>
      item.collectedAt.startsWith(route.split("/").pop()!),
    );
  return route === "radar"
    ? items.slice(0, 12)
    : route === ""
      ? items.slice(0, 10)
      : [];
}
