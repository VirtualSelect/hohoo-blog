import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (f) =>
  JSON.parse(fs.readFileSync(new URL(f, import.meta.url), "utf8"));
const editorial = read("../../../data/editorial.json");
for (const locale of ["zh-CN", "en", "zh-TW"]) {
  test(`${locale}: research is discoverable without promoting incomplete experiments`, () => {
    const data = read(`../generated/${locale}.json`);
    const entries = data.globalData["content-index"].entries;
    for (const id of [
      ...editorial.featuredProjects,
      ...editorial.featuredArticles,
      "doc:llm/context-position-experiment",
      "lab:context-position",
      "lab:vl01-pickup-offset",
    ]) {
      const entry = entries.find((e) => e.id === id);
      assert.ok(entry, id);
      assert.equal(
        entry.translationStatus,
        locale === "zh-CN" ? "ORIGINAL" : "AI_TRANSLATED",
      );
    }
    assert.equal(
      entries.find((e) => e.id === "lab:context-position").status,
      "inconclusive",
    );
    const doc = data.documents.find(
      (d) => d.route === "docs/llm/context-position-experiment",
    );
    assert.ok(doc.html.includes("429") && doc.html.includes("77,043"));
    assert.ok(doc.headings.length >= 7);
    const learning = data.globalData["learning-index"].entries;
    assert.ok(learning.some((e) => e.stepId === "structured-output"));
  });
}
test("display evidence retains phases, honest outcomes and actual local media", () => {
  const e = read("../../../data/practice/mujoco.json");
  assert.deepEqual(
    e.runs.map((r) => r.offsetMm),
    [0, 25, 50],
  );
  assert.deepEqual(
    e.runs.map((r) => r.summary.success),
    [true, false, false],
  );
  for (const r of e.runs) {
    assert.equal(r.trajectory.length, 460);
    assert.match(r.csvSha256, /^[a-f0-9]{64}$/);
    assert.equal(r.stages.length, 9);
    for (const stage of r.stages)
      assert.equal(stage.phase, stage.observation.phase);
    for (const url of [r.video, r.poster])
      assert.ok(
        fs.existsSync(new URL("../../../static" + url, import.meta.url)),
      );
  }
});
