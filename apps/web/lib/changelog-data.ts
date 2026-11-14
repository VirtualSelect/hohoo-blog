import type { ContentEntry, Locale } from "./site-types";
import { matchesReadingQuery } from "./reading-paths.mjs";

type Text = string | readonly string[];
interface ChangelogContentEntry extends ContentEntry {
  draft?: boolean;
  unlisted?: boolean;
}
export type ChangelogCategory = "all" | "site" | "content" | "release";
export interface ChangelogFilters {
  category: ChangelogCategory;
  month: string;
  q: string;
}
export interface ChangelogCodeRecord {
  project: string;
  commit: string;
  date: string;
  title: string;
  headline?: Text;
  summary?: Text;
  modules?: string[];
  committedAt?: string;
  scope?: "repository" | "branch";
  branch?: string;
}
export interface ArticleHistoryRecord {
  date: string;
  commit: string;
  summary: Text;
  kind?: "publication" | "revision";
}
export interface ChangelogRecord {
  id: string;
  category: Exclude<ChangelogCategory, "all">;
  kind: "site" | "publication" | "revision";
  date: string;
  timestamp?: string;
  title: string;
  summary: string;
  modules: string[];
  contentId?: string;
  href?: string;
  commits: string[];
  originalTitle?: string;
  branch?: string;
  preview: boolean;
  dateSource: "commit" | "publication" | "revision";
}

export const changelogDefaults: ChangelogFilters = {
  category: "all",
  month: "all",
  q: "",
};
export const changelogRepository =
  "https://github.com/VirtualSelect/hohoo-blog";
const fullCommit = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
const validDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
function localized(value: Text | undefined, locale: Locale) {
  if (typeof value === "string") return value;
  const index = locale === "en" ? 1 : locale === "zh-TW" ? 2 : 0;
  return value?.[index] || value?.[0] || "";
}
function routePath(href: string) {
  return href
    .split(/[?#]/)[0]
    .replace(/^\/(?:en|zh-TW)(?=\/)/, "")
    .replace(/^\//, "");
}
function contentModule(entry: ContentEntry) {
  return entry.type === "doc"
    ? "learning"
    : entry.type === "note"
      ? "knowledge"
      : "articles";
}

// Called while the existing content snapshot is prerendered. No network or Git
// process runs on a page request. Code summaries are maintained in build-log;
// new publication dates follow the generated index on every content build.
export function buildChangelog({
  entries,
  codeRecords,
  articleHistory = {},
  locale = "zh-CN",
  includePreview = false,
}: {
  entries: ChangelogContentEntry[];
  codeRecords: ChangelogCodeRecord[];
  articleHistory?: Record<string, ArticleHistoryRecord[]>;
  locale?: Locale;
  includePreview?: boolean;
}): ChangelogRecord[] {
  const records = new Map<string, ChangelogRecord>();
  for (const item of codeRecords) {
    const preview = item.scope === "branch";
    if (
      item.project !== "project:hohoo-blog" ||
      !fullCommit(item.commit) ||
      !validDate(item.date) ||
      (preview && (!includePreview || !item.branch))
    )
      continue;
    const id = "commit:" + item.commit;
    if (records.has(id)) continue;
    const timestamp =
      item.committedAt?.startsWith(item.date + "T") &&
      Number.isFinite(Date.parse(item.committedAt))
        ? item.committedAt
        : undefined;
    records.set(id, {
      id,
      category: "site",
      kind: "site",
      date: item.date,
      timestamp,
      title: localized(item.headline, locale) || item.title,
      summary: localized(item.summary, locale),
      modules: item.modules?.length ? [...new Set(item.modules)] : ["site"],
      commits: [item.commit],
      originalTitle: item.title,
      branch: preview ? item.branch : undefined,
      preview,
      dateSource: "commit",
    });
  }

  const selected = new Map<string, ContentEntry>();
  for (const entry of entries) {
    if (
      !["doc", "blog", "note"].includes(entry.type) ||
      entry.status !== "published" ||
      entry.draft ||
      entry.unlisted ||
      entry.translationStatus === "MISSING" ||
      !entry.href?.startsWith("/") ||
      entry.href.startsWith("//") ||
      !validDate(entry.date)
    )
      continue;
    const existing = selected.get(entry.id);
    if (!existing || (existing.locale !== locale && entry.locale === locale))
      selected.set(entry.id, entry);
  }
  for (const entry of selected.values()) {
    const date = entry.date!;
    const history = articleHistory[routePath(entry.href)] || [];
    const publicationCommits = [
      ...new Set(
        history
          .filter(
            (item) =>
              item.date === date &&
              item.kind !== "revision" &&
              fullCommit(item.commit),
          )
          .map((item) => item.commit),
      ),
    ];
    const id = "content:" + entry.id + ":publication";
    records.set(id, {
      id,
      category: "content",
      kind: "publication",
      date,
      title: entry.title,
      summary: entry.description || "",
      modules: [contentModule(entry)],
      contentId: entry.id,
      href: entry.href,
      commits: publicationCommits,
      preview: false,
      dateSource: "publication",
    });
    for (const revision of history) {
      // updated alone never creates a revision. A dated, attributed history
      // record must describe a later change; first-publication evidence above
      // enriches the original event instead of duplicating it.
      if (
        revision.kind === "publication" ||
        !validDate(revision.date) ||
        revision.date <= date ||
        !fullCommit(revision.commit) ||
        !localized(revision.summary, locale).trim()
      )
        continue;
      const revisionId = "content:" + entry.id + ":revision:" + revision.commit;
      if (records.has(revisionId)) continue;
      records.set(revisionId, {
        id: revisionId,
        category: "content",
        kind: "revision",
        date: revision.date,
        title: entry.title,
        summary: localized(revision.summary, locale),
        modules: [contentModule(entry)],
        contentId: entry.id,
        href: entry.href,
        commits: [revision.commit],
        preview: false,
        dateSource: "revision",
      });
    }
  }
  // Neither a content publication nor a code commit proves a deployment.
  // No release events are synthesized without a separate verified source.
  return [...records.values()].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.timestamp || "").localeCompare(a.timestamp || "") ||
      a.id.localeCompare(b.id),
  );
}

export function changelogMonths(records: ChangelogRecord[]) {
  return [...new Set(records.map((record) => record.date.slice(0, 7)))]
    .sort()
    .reverse();
}
export function readChangelogFilters(
  search: string,
  months?: string[],
): ChangelogFilters {
  const params = new URLSearchParams(search);
  const category = params.get("category") || "all";
  const month = params.get("month") || "all";
  return {
    category: ["all", "site", "content", "release"].includes(category)
      ? (category as ChangelogCategory)
      : "all",
    month:
      /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
      (!months || months.includes(month))
        ? month
        : "all",
    q: params.get("q") || "",
  };
}
export function changelogFilterUrl(href: string, filters: ChangelogFilters) {
  const url = new URL(href, "https://huhohoo.com");
  for (const [key, value] of Object.entries(filters)) {
    if ((key === "q" && !value.trim()) || (key !== "q" && value === "all"))
      url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return url.pathname + url.search + url.hash;
}
export function filterChangelog(
  records: ChangelogRecord[],
  filters: ChangelogFilters,
) {
  return records.filter(
    (record) =>
      (filters.category === "all" || record.category === filters.category) &&
      (filters.month === "all" || record.date.startsWith(filters.month)) &&
      matchesReadingQuery(
        filters.q,
        record.title,
        record.summary,
        record.originalTitle,
        record.contentId,
        record.branch,
        record.date,
        record.commits.join(" "),
      ),
  );
}
