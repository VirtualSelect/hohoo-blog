import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p) =>
  JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
test("curated Radar exercises point to existing signals and all locale routes", () => {
  const registry = read("../../../data/radar-practice.json");
  const signals = read("../../../data/news/items.json");
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = read("../generated/" + locale + ".json");
    for (const item of registry) {
      assert(signals.some((s) => s.id === item.signalId));
      assert(data.routes.includes(item.href.slice(1).split("#")[0]));
      assert.equal(item.question.length, 3);
      assert.equal(item.label.length, 3);
    }
  }
});
test("article history only references existing articles and explicit commit evidence", () => {
  const history = read("../../../data/article-history.json"),
    data = read("../generated/zh-CN.json");
  for (const [route, records] of Object.entries(history)) {
    assert(data.documents.some((d) => d.route === route));
    for (const r of records) {
      assert.match(r.commit, /^[a-f0-9]{40}$/);
      assert.equal(r.summary.length, 3);
      assert(Number.isFinite(Date.parse(r.date)));
    }
  }
});
