const manifest = require("../../scripts/i18n/check.cjs").resolveManifest();
const { translationStatus } = require("../../src/utils/localization.cjs");
const digests = require("../../data/radar-digests.json");
const projects = require("../../data/projects.json");
const experiments = require("../../data/experiments.json");
const notes = require("../../data/notes.json");
const papers = require("../../data/papers.json");
const dateOnly = (value) =>
  value
    ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
    : undefined;
function customEntries(prefix = "") {
  return [
    ...digests
      .filter((d) => d.status === "published")
      .map((d) => ({
        ...d,
        type: "radar-digest",
        date: dateOnly(d.publishedAt),
        href: prefix + "/radar/weekly/" + d.week,
      })),
    ...projects.map((p) => ({ ...p, href: prefix + "/projects/" + p.slug })),
    ...experiments.map((e) => ({
      ...e,
      id: "lab:" + e.id,
      slug: e.id,
      type: "lab",
      title: e.zh,
      titleEn: e.en,
      description: e.goalZh,
      descriptionEn: e.goalEn,
      href: prefix + "/labs/" + e.id,
    })),
    ...notes
      .filter((n) => n.status === "published")
      .map((n) => ({ ...n, type: "note", href: prefix + "/notes/" + n.slug })),
    ...papers.map((p) => ({
      ...p,
      type: "paper",
      status: "to-read",
      domain: p.categories[0],
      href: prefix + "/papers#" + p.slug,
      description: p.zh.question,
      descriptionEn: p.en.question,
    })),
  ];
}
function collectContent(allContent, prefix = "") {
  const locale = prefix.slice(1) || "zh-CN";
  const entries = customEntries(prefix).map((e) => {
    const title =
      locale === "en"
        ? e.titleEn || (e.type === "lab" ? e.en : e.title)
        : locale === "zh-TW"
          ? e.titleTw || e.title
          : e.title;
    const description =
      locale === "en"
        ? e.descriptionEn || e.description
        : locale === "zh-TW"
          ? e.descriptionTw || e.description
          : e.description;
    return {
      ...e,
      title,
      description,
      locale,
      sourceLocale: "zh-CN",
      ...(e.type === "note"
        ? { translationStatus: translationStatus(manifest[e.id], locale) }
        : {}),
    };
  });
  for (const doc of allContent.docs || []) {
    const f = doc.frontMatter || {};
    if (
      f.draft ||
      f.unlisted ||
      f.landing ||
      f.status === "planning" ||
      doc.id === "introduction" ||
      ["ai-apps/index", "llm/index", "embodied-ai/index"].includes(doc.id)
    )
      continue;
    entries.push({
      id: "doc:" + doc.id,
      locale,
      sourceLocale: "zh-CN",
      localization: manifest["doc:" + doc.id],
      translationStatus: translationStatus(manifest["doc:" + doc.id], locale),
      type: "doc",
      articleKind: f.article_kind || "tutorial",
      title: doc.title,
      description: doc.description,
      href: doc.permalink,
      domain: f.domain,
      status: f.status || "published",
      date: dateOnly(f.published_at || f.date),
      updated: dateOnly(f.updated),
      minutes: f.reading_minutes,
      stepId: f.learning_step,
      related: f.related || [],
      prerequisites: f.prerequisites || [],
    });
  }
  for (const post of allContent.blogPosts || []) {
    const m = post.metadata || {},
      f = m.frontMatter || {};
    if (f.draft || f.unlisted) continue;
    entries.push({
      id: "blog:" + (f.slug || m.permalink.split("/").filter(Boolean).pop()),
      locale,
      sourceLocale: "zh-CN",
      translationStatus: translationStatus(
        manifest[
          "blog:" + (f.slug || m.permalink.split("/").filter(Boolean).pop())
        ],
        locale,
      ),
      type: "blog",
      articleKind: f.article_kind || "essay",
      title: m.title,
      description: m.description,
      href: m.permalink,
      status: "published",
      date: dateOnly(m.date),
      minutes: m.readingTime
        ? Math.max(1, Math.ceil(m.readingTime))
        : undefined,
      related: f.related || [],
    });
  }
  validate(entries);
  return entries;
}
function validate(entries) {
  const ids = new Set(),
    routes = new Set();
  for (const e of entries) {
    if (ids.has(e.id) || routes.has(e.href))
      throw Error("Duplicate content: " + e.id);
    ids.add(e.id);
    routes.add(e.href);
    if (!e.href || !e.title) throw Error("Missing content fields: " + e.id);
    if (
      e.articleKind &&
      !Object.hasOwn(
        require("../../src/utils/writing-kinds.cjs").writingKinds,
        e.articleKind,
      )
    )
      throw Error("Invalid article kind: " + e.id);
    if (
      e.date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
        !Number.isFinite(Date.parse(e.date)) ||
        new Date(e.date).toISOString().slice(0, 10) !== e.date)
    )
      throw Error("Invalid date: " + e.id);
    if (
      e.domain &&
      !["ai-apps", "llm", "embodied-ai", "engineering", "meta"].includes(
        e.domain,
      )
    )
      throw Error("Invalid domain: " + e.id);
    if (
      ![
        "planning",
        "planned",
        "inconclusive",
        "learning",
        "building",
        "experiment",
        "published",
        "archived",
        "production",
        "running",
        "completed",
        "to-read",
        "reading",
        "read",
      ].includes(e.status)
    )
      throw Error("Invalid status: " + e.id);
    if (
      e.type === "lab" &&
      e.status === "completed" &&
      (!e.result || !e.method)
    )
      throw Error("Completed lab requires evidence: " + e.id);
    for (const field of ["repo", "demo", "url"])
      if (e[field] && !/^https?:\/\//.test(e[field]))
        throw Error("Invalid external URL: " + e.id);
  }
  for (const e of entries)
    for (const id of [...(e.related || []), ...(e.prerequisites || [])])
      if (!ids.has(id)) throw Error("Unknown related content: " + id);
}
function activity(entries) {
  return entries
    .filter(
      (e) =>
        e.date &&
        ["published", "production", "completed", "read"].includes(e.status) &&
        e.type !== "radar-item",
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
module.exports = { collectContent, validate, activity };
