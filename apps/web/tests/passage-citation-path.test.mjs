import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { passageCitation } from "../lib/passage-citation.mjs";

const text = "用于验证来源范围的真实回归用例。";
const passage = {
  title: "引用来源边界",
  heading: "路径",
  text,
  contentHash: createHash("sha256").update(text).digest("hex"),
};
const index = "/search/zh-CN-0123456789abcdef.json";

test("normalization cannot turn an accepted article source into another route", () => {
  for (const href of [
    "/docs/../api/visitors",
    "/docs/%2e%2e/api/visitors",
    "/docs/.%2e/api/visitors",
    "/docs/%2E./api/visitors",
    "/en/docs/../../api/visitors",
    "/zh-TW/blog/../../api/visitors",
    "/docs/..\\api/visitors",
    "/docs/example\n/../../api/visitors",
  ]) {
    assert.throws(
      () => passageCitation({ ...passage, href }, index),
      undefined,
      href,
    );
  }
});

test("existing article paths, locale prefixes and anchors remain valid", () => {
  for (const href of [
    "/docs/ai-apps/java-retrieval-evidence#limits",
    "/en/docs/ai-apps/java-retrieval-evidence#limits",
    "/zh-TW/blog/example#引用",
    "/blog/a-new-milestone",
  ]) {
    const citation = passageCitation({ ...passage, href }, index);
    assert(citation.includes(new URL(href, "https://huhohoo.com").href));
  }
});
