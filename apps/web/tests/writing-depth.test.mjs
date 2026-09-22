import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import kinds from "../../../src/utils/writing-kinds.cjs";
import localization from "../../../src/utils/localization.cjs";

const articles = [
  "ai-apps/radar-publishing-pipeline",
  "llm/kv-cache",
  "embodied-ai/openvla-action-pipeline",
];
for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(`${locale}: deep articles remain discoverable and translated with valid relations`, () => {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const entries = localization.writingEntries(
      data.globalData["content-index"].entries,
    );
    for (const id of articles) {
      const entry = entries.find((e) => e.id === "doc:" + id);
      assert(entry, `${id} missing from writing`);
      assert.equal(
        entry.translationStatus,
        locale === "zh-CN" ? "ORIGINAL" : "AI_TRANSLATED",
      );
      assert(["case-study", "mechanism"].includes(entry.articleKind));
      const doc = data.documents.find((d) => d.route === "docs/" + id);
      assert(!doc.sourceFallback);
      assert(doc.headings.length >= 6);
      assert(doc.html.includes("https://"));
      const prefix = locale === "zh-CN" ? "" : "/" + locale;
      for (const match of doc.html.matchAll(
        /href="(\/[^"#?]*)(?:[?#][^"]*)?"/g,
      )) {
        assert(match[1].startsWith(prefix + "/"));
        assert(
          data.routes.includes(match[1].slice(prefix.length + 1)),
          match[1],
        );
      }
    }
    assert.equal(
      kinds.filterWriting(entries, { kind: "mechanism", domain: "llm" }).length,
      1,
    );
    assert.equal(
      kinds.filterWriting(entries, {
        kind: "case-study",
        domain: "embodied-ai",
      }).length,
      0,
    );
  });
  test(`${locale}: article arithmetic runs as printed without a model or network`, () => {
    const prefix = locale === "zh-CN" ? "docs/" : `i18n/${locale}/docs/`;
    const results = articles.map((id) => {
      const source = fs.readFileSync(
        new URL(`../../../${prefix}${id}.md`, import.meta.url),
        "utf8",
      );
      const code = source.match(/```javascript\r?\n([\s\S]*?)```/)[1];
      const logs = [];
      vm.runInNewContext(
        code,
        { console: { log: (...args) => logs.push(...args) } },
        { timeout: 500 },
      );
      return JSON.parse(JSON.stringify(logs));
    });
    assert.deepEqual(results[0], [
      { siteSlots: 3, aihotSlots: 1, aihotCanAdd: 1 },
    ]);
    assert.deepEqual(results[1], [1, 16]);
    assert.equal(results[2][0].index, 2);
    assert.equal(results[2][0].bin, 4);
    assert(Math.abs(results[2][0].decoded - 2 / 3) < 1e-14);
  });
}
test("writing filters preserve legacy bookmarks and reject unsupported values", () => {
  assert.deepEqual(
    kinds.writingFilters("?type=doc&kind=mechanism&domain=llm"),
    { type: "doc", kind: "mechanism", domain: "llm" },
  );
  assert.deepEqual(
    kinds.writingFilters("?kind=__proto__&domain=made-up&type=project"),
    { type: "all", kind: "all", domain: "all" },
  );
});
