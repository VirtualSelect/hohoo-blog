import type {
  ArticleKind,
  ContentEntry,
  ContentType,
  Domain,
  LocalizedText,
} from "../../apps/web/lib/site-types.ts";
export interface WritingFilters {
  kind: ArticleKind | "all";
  domain: Domain | "all";
  type: "doc" | "note" | "paper" | "blog" | "all";
}
function isKind(value: string | null): value is ArticleKind {
  return value !== null && Object.hasOwn(writingKinds, value);
}
function isDomain(value: string | null): value is Domain {
  return (
    value === "ai-apps" ||
    value === "llm" ||
    value === "embodied-ai" ||
    value === "rag"
  );
}
// Reading purpose is independent from the storage type (doc/note/blog).
export const writingKinds: Record<ArticleKind, LocalizedText> = {
  tutorial: ["实战教程", "Tutorials", "實作教程"],
  "case-study": ["工程案例", "Engineering cases", "工程案例"],
  mechanism: ["机制拆解", "Mechanisms", "機制拆解"],
  retrospective: ["实验复盘", "Experiment reviews", "實驗回顧"],
  essay: ["随笔", "Essays", "隨筆"],
  note: ["知识笔记", "Notes", "知識筆記"],
  paper: ["论文阅读", "Paper readings", "論文閱讀"],
};
export function writingKind(
  entry: Pick<ContentEntry, "type" | "articleKind"> & {
    article_kind?: ArticleKind;
  },
): ArticleKind | undefined {
  const defaults: Partial<Record<ContentType, ArticleKind>> = {
    doc: "tutorial",
    blog: "essay",
    note: "note",
    paper: "paper",
  };
  return entry.articleKind || entry.article_kind || defaults[entry.type];
}
export function writingFilters(search: string): WritingFilters {
  const params = new URLSearchParams(search);
  const kind = params.get("kind"),
    domain = params.get("domain"),
    type = params.get("type");
  return {
    kind: isKind(kind) ? kind : "all",
    domain: isDomain(domain) ? domain : "all",
    // Keep existing /articles?type=doc|note|paper|blog bookmarks valid.
    type:
      type === "doc" || type === "note" || type === "paper" || type === "blog"
        ? type
        : "all",
  };
}
export function filterWriting<T extends ContentEntry>(
  entries: T[],
  { kind = "all", domain = "all", type = "all" }: Partial<WritingFilters>,
) {
  return entries.filter(
    (e) =>
      (kind === "all" || writingKind(e) === kind) &&
      (domain === "all" || e.domain === domain) &&
      (type === "all" || e.type === type),
  );
}
