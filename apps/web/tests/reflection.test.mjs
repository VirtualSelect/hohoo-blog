import test from "node:test";
import assert from "node:assert/strict";
import {
  blankReflection,
  decodeReflection,
  reflectionKey,
  reflectionMarkdown,
} from "../lib/reflection.mjs";

test("reflection records validate schema without destroying unreadable data", () => {
  assert.deepEqual(decodeReflection(null), blankReflection());
  const note = {
    takeaway: "历史由程序发送",
    question: "上下文上限？",
    next: "运行 Demo",
  };
  assert.deepEqual(
    decodeReflection(JSON.stringify({ version: 1, ...note })),
    note,
  );
  for (const raw of [
    "{",
    "null",
    JSON.stringify({ version: 2, ...note }),
    JSON.stringify({ version: 1, ...note, next: false }),
  ])
    assert.throws(() => decodeReflection(raw));
  assert.notEqual(reflectionKey("docs/a"), reflectionKey("blog/a"));
});
test("Markdown export includes the source and only the reader’s nonempty fields", () => {
  assert.equal(
    reflectionMarkdown(
      "A",
      "https://huhohoo.com/docs/a",
      { takeaway: "  我的理解  ", question: "", next: "" },
      { takeaway: "理解" },
    ),
    "# A\n\nhttps://huhohoo.com/docs/a\n\n## 理解\n\n我的理解\n",
  );
});
