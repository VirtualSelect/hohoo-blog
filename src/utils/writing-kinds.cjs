// Reading purpose is independent from the storage type (doc/note/blog).
const writingKinds = {
  tutorial: ["实战教程", "Tutorials", "實作教程"],
  "case-study": ["工程案例", "Engineering cases", "工程案例"],
  mechanism: ["机制拆解", "Mechanisms", "機制拆解"],
  retrospective: ["实验复盘", "Experiment reviews", "實驗回顧"],
  essay: ["随笔", "Essays", "隨筆"],
  note: ["知识笔记", "Notes", "知識筆記"],
  paper: ["论文阅读", "Paper readings", "論文閱讀"],
};
function writingKind(entry) {
  return (
    entry.articleKind ||
    entry.article_kind ||
    { doc: "tutorial", blog: "essay", note: "note", paper: "paper" }[entry.type]
  );
}
const domains = ["all", "ai-apps", "llm", "embodied-ai"];
function writingFilters(search) {
  const params = new URLSearchParams(search);
  const kind = params.get("kind"),
    domain = params.get("domain"),
    type = params.get("type");
  return {
    kind: Object.hasOwn(writingKinds, kind) ? kind : "all",
    domain: domains.includes(domain) ? domain : "all",
    // Keep existing /articles?type=doc|note|paper|blog bookmarks valid.
    type: ["doc", "note", "paper", "blog"].includes(type) ? type : "all",
  };
}
function filterWriting(
  entries,
  { kind = "all", domain = "all", type = "all" },
) {
  return entries.filter(
    (e) =>
      (kind === "all" || writingKind(e) === kind) &&
      (domain === "all" || e.domain === domain) &&
      (type === "all" || e.type === type),
  );
}
module.exports = { writingKinds, writingKind, writingFilters, filterWriting };
