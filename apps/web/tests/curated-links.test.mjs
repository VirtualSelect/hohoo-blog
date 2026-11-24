import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p) =>
  JSON.parse(fs.readFileSync(new URL(p, import.meta.url), "utf8"));
test("curated Radar exercises point to existing signals and all locale routes", () => {
  const registry = read("../../../data/radar-practice.json");
  const signals = read("../../../data/news/items.json");
  assert(
    registry.length > 0,
    "the curated signal-to-evidence loop must not be empty",
  );
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = read("../generated/" + locale + ".json");
    for (const item of registry) {
      const signal = signals.find((s) => s.id === item.signalId);
      assert(signal);
      assert.match(signal.sourceArticleUrl, /^https:\/\//);
      const [route, fragment] = item.href.slice(1).split("#");
      assert(data.routes.includes(route));
      const document = data.documents.find((d) => d.route === route);
      assert(
        document,
        "the related evidence must have readable content in every locale",
      );
      if (fragment) assert(document.html.includes(`id="${fragment}"`));
      assert.equal(item.question.length, 3);
      assert.equal(item.label.length, 3);
      for (const value of [...item.question, ...item.label])
        assert(typeof value === "string" && value.trim());
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
