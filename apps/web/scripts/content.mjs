import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import matter from "gray-matter";
import { marked } from "marked";
import sanitize from "sanitize-html";
const require = createRequire(import.meta.url);
const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(here, "../..");
const {
  collectContent,
  activity,
} = require("../../../lib/content/content-index.cjs");
const { collectEntries } = require("../../../lib/content/learning-index.cjs");
const { signals, isoWeek } = require("../../../src/utils/radar.cjs");
const { projectSignal } = require("../../../src/utils/radar-locale.cjs");
const { resolveManifest } = require("../../../scripts/i18n/check.cjs");
const Prism = require("prismjs");
require("prismjs/components/prism-java");
require("prismjs/components/prism-json");
require("prismjs/components/prism-bash");
const json = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)],
    );
const output = path.join(here, "generated");
fs.mkdirSync(output, { recursive: true });
const put = (p, v) => fs.writeFileSync(path.join(output, p), JSON.stringify(v));
put("manifest.json", resolveManifest());
const basePages = [
  "",
  "articles",
  "learning",
  "build",
  "projects",
  "labs",
  "notes",
  "papers",
  "reading",
  "research",
  "timeline",
  "now",
  "about",
  "subscribe",
  "changelog",
  "radar",
  "radar/weekly",
  "blog",
  "blog/tags",
  "blog/tags/blog",
  "blog/archive",
];
const rawSignals = signals(
  json("data/news/items.json"),
  json("config/news-sources.json"),
);
for (const locale of ["zh-CN", "zh-TW", "en"]) {
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  const documents = [];
  const docs = [];
  const blogPosts = [];
  for (const kind of ["docs", "blog", "news/daily"]) {
    const contentRoot = path.join(
      root,
      kind === "news/daily" ? "src/pages/news/daily" : kind,
    );
    for (const file of walk(contentRoot).filter((p) => /\.(md|mdx)$/.test(p))) {
      const relative = path.relative(contentRoot, file).replaceAll("\\", "/");
      if (
        kind === "docs" &&
        ((!relative.includes("/") && relative !== "intro.md") ||
          relative.startsWith("templates/"))
      )
        continue;
      let translated = path.join(root, "i18n", locale, kind, relative);
      const source = matter(fs.readFileSync(file, "utf8"));
      const local =
        locale !== "zh-CN" && fs.existsSync(translated)
          ? matter(fs.readFileSync(translated, "utf8"))
          : source;
      const f = { ...source.data, ...local.data };
      if (f.draft || f.unlisted) continue;
      const id =
        f.id ||
        (kind === "blog" ? f.slug : undefined) ||
        relative.replace(/\.(md|mdx)$/, "");
      const slug = String(f.slug || id).replace(/^\//, "");
      const route = kind + "/" + slug;
      const description =
        f.description ||
        local.content
          .split("<!-- truncate -->")[0]
          .trim()
          .replace(/[#*`]/g, "")
          .slice(0, 170);
      const meta = {
        id,
        title: f.title,
        description,
        frontMatter: f,
        permalink: prefix + "/" + route,
      };
      if (kind === "docs") docs.push(meta);
      else if (kind === "blog")
        blogPosts.push({ metadata: { ...meta, date: f.date, readingTime: 1 } });
      const headings = [];
      const counts = new Map();
      const renderer = new marked.Renderer();
      renderer.code = function ({ text, lang }) {
        const language = (lang || "text").split(/\s/)[0];
        const grammar = Prism.languages[language];
        const escaped = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return (
          '<pre><code class="language-' +
          language.replace(/[^a-z0-9-]/gi, "") +
          '">' +
          (grammar ? Prism.highlight(text, grammar, language) : escaped) +
          "</code></pre>"
        );
      };
      renderer.heading = function ({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const base = text
          .replace(/<[^>]*>/g, "")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/^-|-$/g, "");
        const count = counts.get(base) || 0;
        counts.set(base, count + 1);
        const id = base + (count ? "-" + count : "");
        if (depth === 2 || depth === 3)
          headings.push({ id, text: text.replace(/<[^>]*>/g, ""), depth });
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      };
      let body = local.content.replace(/^import .*;?\s*$/gm, "").replace(
        /^:::\w+[^\S\r\n]*(.*)\r?\n([\s\S]*?)^:::[^\S\r\n]*$/gm,
        (_, title, content) =>
          "> **" +
          title +
          "**\n>\n" +
          content
            .trim()
            .split(/\r?\n/)
            .map((line) => "> " + line)
            .join("\n"),
      );
      body = body.replace(
        /\]\(\.\/([^)]*)\.md\)/g,
        (_, p) => `](${prefix}/docs/${p.replace(/\/index$/, "")})`,
      );
      let html = marked.parse(body, { renderer });
      html = sanitize(html, {
        allowedTags: [
          ...sanitize.defaults.allowedTags,
          "img",
          "details",
          "summary",
        ],
        allowedAttributes: {
          ...sanitize.defaults.allowedAttributes,
          "*": ["id", "class"],
          img: ["src", "alt", "width", "height", "loading"],
        },
        transformTags: {
          a: (tag, attrs) => {
            if (
              locale !== "zh-CN" &&
              attrs.href?.startsWith("/") &&
              !/^\/(en|zh-TW)(\/|$)/.test(attrs.href)
            )
              attrs.href = prefix + attrs.href;
            return { tagName: tag, attribs: attrs };
          },
        },
      });
      documents.push({
        route,
        kind,
        metadata: meta,
        frontMatter: f,
        html,
        headings,
        sourceFallback: local === source && locale !== "zh-CN",
      });
    }
  }
  const allContent = { docs, blogPosts };
  const entries = collectContent(allContent, prefix);
  const items = rawSignals.map((i) => projectSignal(i, locale));
  const weeks = [...new Set(items.map((i) => isoWeek(i.publishedAt)))];
  const search = entries
    .filter((e) => e.translationStatus !== "MISSING")
    .map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      href: e.href,
      type: e.type,
      topic: e.domain,
      tags: e.tags || [],
      status: e.status,
    }));
  search.push(
    ...items.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.summary,
      type: "radar",
      href: prefix + "/radar#signal-" + e.id,
      topic: e.domain,
      tags: e.tags || [],
    })),
  );
  const routes = [
    ...new Set([
      ...basePages,
      ...documents.map((d) => d.route),
      ...entries
        .filter((e) => ["project", "lab", "note"].includes(e.type))
        .map((e) => e.href.slice(prefix.length + 1)),
      ...weeks.map((w) => "radar/weekly/" + w),
    ]),
  ];
  const globalData = {
    "content-index": {
      entries,
      activity: activity(
        entries.filter((e) => e.translationStatus !== "MISSING"),
      ),
    },
    "learning-index": { entries: collectEntries(allContent) },
    "radar-pages": { preview: items.slice(0, 3) },
  };
  put(locale + ".json", {
    locale,
    routes,
    documents,
    globalData,
    items,
    search,
    weeks,
  });
  const escape = (s) =>
    String(s || "").replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const feed = (title, list) =>
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>' +
    escape(title) +
    "</title><link>https://huhohoo.com" +
    prefix +
    "</link><description>" +
    escape(title) +
    "</description><language>" +
    locale +
    "</language>" +
    list
      .map(
        (e) =>
          "<item><title>" +
          escape(e.title) +
          "</title><link>" +
          escape(e.url) +
          "</link><guid>" +
          escape(e.id) +
          "</guid><description>" +
          escape(e.description) +
          "</description>" +
          (e.date
            ? "<pubDate>" + new Date(e.date).toUTCString() + "</pubDate>"
            : "") +
          "</item>",
      )
      .join("") +
    "</channel></rss>";
  for (const [target, title, list] of [
    [
      "blog/rss.xml",
      "Hohoo / Writing",
      entries
        .filter(
          (e) =>
            ["doc", "blog"].includes(e.type) &&
            e.status === "published" &&
            e.translationStatus !== "MISSING",
        )
        .map((e) => ({ ...e, url: "https://huhohoo.com" + e.href })),
    ],
    [
      "news/rss.xml",
      "Hohoo / AI Radar",
      items.map((e) => ({ ...e, date: e.publishedAt, description: e.summary })),
    ],
    [
      "radar/rss.xml",
      "Hohoo / AI Radar",
      items.map((e) => ({ ...e, date: e.publishedAt, description: e.summary })),
    ],
  ]) {
    const dest = path.join(here, "public", prefix, target);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, feed(title, list));
  }
}
// Static assets stay authored in one place; regenerate for every build.
fs.mkdirSync(path.join(here, "public"), { recursive: true });
fs.cpSync(path.join(root, "static"), path.join(here, "public"), {
  recursive: true,
});
console.log(
  "Next content: three locales, existing metadata validation and static assets generated.",
);
