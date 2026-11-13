import sanitize from "sanitize-html";
import { createHash } from "node:crypto";
const hash = (text) => createHash("sha256").update(text).digest("hex");

function plain(html) {
  return sanitize(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value) => {
      const code =
        value[0].toLowerCase() === "x"
          ? parseInt(value.slice(1), 16)
          : Number(value);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/g,
      (_, name) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[name],
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Keep disclosure questions with their prose, not with neighboring sections.
// Reuse the HTML parser already provided by sanitize-html, including implied closes.
function proseBlocks(html) {
  const blocks = [],
    stack = [];
  const excluded = new Set(["pre", "table", "video", "script", "style"]);
  let disclosureId = 0;
  const active = () => stack.findLast((frame) => frame.block)?.block;
  function flush(block) {
    if (!block?.raw) return;
    const text = plain(block.raw);
    block.raw = "";
    if (!text) return;
    if (block.kind === "summary") {
      const owner = stack.findLast((frame) => frame.disclosure);
      if (owner) owner.disclosure.title = text;
      return;
    }
    const scopes = stack.filter((frame) => frame.disclosure);
    blocks.push({
      kind: block.kind,
      anchor: block.anchor,
      text,
      context: scopes
        .map((frame) => frame.disclosure.title)
        .filter(Boolean)
        .join("\n"),
      group: scopes.map((frame) => frame.disclosure.id).join("/"),
    });
  }
  sanitize(html, {
    allowedTags: [],
    allowedAttributes: {},
    onOpenTag(name, attributes) {
      const ignored = stack.at(-1)?.ignored || excluded.has(name);
      const inSummary = stack.some((frame) => frame.block?.kind === "summary");
      const kind =
        ["h2", "h3"].includes(name) && attributes.id
          ? name
          : ["p", "li"].includes(name)
            ? "text"
            : name === "summary" && stack.some((frame) => frame.disclosure)
              ? "summary"
              : null;
      if (!ignored && !inSummary && (kind || name === "details"))
        flush(active());
      const frame = { name, ignored };
      stack.push(frame);
      if (ignored || inSummary) return;
      if (name === "details")
        frame.disclosure = { id: ++disclosureId, title: "" };
      if (kind) frame.block = { kind, anchor: attributes.id, raw: "" };
      if (name === "br" && active()) active().raw += " ";
    },
    onCloseTag() {
      const frame = stack.at(-1);
      if (!frame?.ignored) flush(frame?.block);
      stack.pop();
    },
    textFilter(text) {
      const block = active();
      if (block && !stack.at(-1)?.ignored) block.raw += text;
      return "";
    },
  });
  return blocks;
}

// Read the already rendered HTML: heading IDs stay identical to article links.
export function buildSearchSections(documents, entries) {
  const published = new Map(
    entries
      .filter(
        (entry) =>
          ["doc", "blog"].includes(entry.type) &&
          entry.status === "published" &&
          entry.translationStatus !== "MISSING",
      )
      .map((entry) => [entry.href, entry]),
  );
  const passages = [];
  for (const doc of documents) {
    const entry = published.get(doc.metadata.permalink);
    if (!entry || doc.sourceFallback || doc.frontMatter.landing) continue;
    let heading = "",
      anchor = "",
      parent = "",
      previousGroup = null;
    for (const block of proseBlocks(doc.html)) {
      if (block.kind !== "text") {
        anchor = block.anchor;
        if (block.kind === "h2") {
          parent = block.text;
          heading = block.text;
        } else heading = parent ? parent + " / " + block.text : block.text;
        continue;
      }
      const { text, context, group } = block;
      if (text.length + context.length < 20 || /^https?:\/\//i.test(text))
        continue;
      const prefix = context ? context + "\n" : "";
      const capacity = 900 - prefix.length;
      if (capacity <= 0)
        throw new Error(
          `Disclosure context exceeds passage budget: ${entry.href}`,
        );
      for (let offset = 0; offset < text.length; offset += capacity) {
        const body = text.slice(offset, offset + capacity);
        const chunk = prefix + body;
        const href = entry.href + (anchor ? "#" + anchor : "");
        const previous = passages.at(-1);
        if (
          previous?.documentId === entry.id &&
          previous.href === href &&
          previousGroup === group &&
          previous.text.length + body.length < 650
        )
          previous.text += " " + body;
        else
          passages.push({
            id: entry.id + ":" + passages.length,
            documentId: entry.id,
            title: entry.title,
            heading,
            href,
            type: entry.type,
            topic: entry.domain,
            ...(context ? { context } : {}),
            text: chunk,
          });
        previousGroup = group;
      }
    }
  }
  return passages.map((passage) => ({
    ...passage,
    id:
      passage.documentId +
      ":" +
      hash(passage.href + "\n" + passage.text).slice(0, 20),
    contentHash: hash(passage.text),
  }));
}
