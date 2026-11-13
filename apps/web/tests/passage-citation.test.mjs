import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { passageCitation } from "../lib/passage-citation.mjs";
import { buildSearchSections } from "../lib/search-sections-build.mjs";
const text = "读取超时不能证明服务端没有处理请求，也不能保证没有产生费用。";
const passage = {
  title: "超时",
  heading: "边界",
  href: "/docs/ai-apps/timeout#limits",
  text,
  contentHash: createHash("sha256").update(text).digest("hex"),
};
const index = "/search/zh-CN-0123456789abcdef.json";
test("citation preserves complete source text, real URL and content fingerprint", () => {
  const copy = passageCitation(passage, index);
  assert(copy.includes("> " + text));
  assert(copy.includes("https://huhohoo.com/docs/ai-apps/timeout#limits"));
  assert(copy.includes(passage.contentHash));
  assert(passageCitation(passage, index, "en").includes("Source excerpt"));
  assert(passageCitation(passage, index, "zh-TW").includes("原文摘錄"));
  for (const href of [
    "https://evil.example/",
    "//evil.example/",
    "javascript:alert(1)",
    "/api/visitors",
  ])
    assert.throws(() => passageCitation({ ...passage, href }, index));
  assert.throws(() =>
    passageCitation({ ...passage, contentHash: "bad" }, index),
  );
  assert.throws(() => passageCitation(passage, "/search/../../secret"));
});
test("passage identity survives unrelated articles and changes when its text changes", () => {
  const make = (href, body) => ({
    metadata: { permalink: href },
    frontMatter: {},
    html: `<h2 id="limits">Limits</h2><p>${body}</p>`,
  });
  const entry = (id) => ({
    id,
    href: "/docs/" + id,
    type: "doc",
    status: "published",
    title: id,
  });
  const first = make("/docs/target", text);
  const original = buildSearchSections([first], [entry("target")])[0];
  const extended = buildSearchSections(
    [
      make(
        "/docs/unrelated",
        "An unrelated article preceding the target document.",
      ),
      first,
    ],
    [entry("unrelated"), entry("target")],
  ).find((item) => item.documentId === "target");
  assert.equal(original.id, extended.id);
  assert.equal(original.contentHash, extended.contentHash);
  assert.notEqual(
    original.id,
    buildSearchSections(
      [make("/docs/target", text + "新增限制。")],
      [entry("target")],
    )[0].id,
  );
});

test("a disclosure citation includes the question and versions changes to that question", () => {
  const question = "864 行降到 432 行，能否说快了 50%？";
  const answer =
    "不能。这里只测出投影行数减少，是否更快仍然要比较同一条件下的查询耗时。";
  const make = (title) =>
    buildSearchSections(
      [
        {
          metadata: { permalink: "/docs/example" },
          frontMatter: {},
          html: `<h2 id="check">Check</h2><details><summary>${title}</summary><p>${answer}</p></details>`,
        },
      ],
      [
        {
          id: "doc:example",
          href: "/docs/example",
          type: "doc",
          status: "published",
          title: "Example",
        },
      ],
    )[0];
  const original = make(question);
  const copy = passageCitation(original, index);
  assert(copy.includes("> " + question + "\n> " + answer));
  assert.equal(
    original.contentHash,
    createHash("sha256").update(original.text).digest("hex"),
  );
  const revised = make(question.replace("864", "1728"));
  assert.notEqual(revised.id, original.id);
  assert.notEqual(revised.contentHash, original.contentHash);
  assert.equal(revised.href, original.href);
});
