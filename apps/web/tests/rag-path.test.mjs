import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  writingFilters,
  filterWriting,
} from "../../../src/utils/writing-kinds.ts";
const read = (file) =>
  JSON.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const tracks = read("../../../data/learning-paths.json");
const rag = tracks.find((track) => track.domain === "rag");
const published = ["java-retrieval-evidence", "java-grounded-claims"];

test("RAG reuses stable article and saved-plan IDs without duplicate steps", () => {
  const steps = tracks.flatMap((track) => track.steps);
  assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
  assert.deepEqual(
    rag.steps.filter((s) => s.doc).map((s) => s.id),
    published,
  );
  assert.equal(steps.filter((s) => s.id === "blog-rag").length, 1);
  assert.ok(rag.steps.some((s) => s.id === "blog-rag" && !s.doc));
  const plans = rag.steps.filter((s) => !s.doc);
  for (const step of plans) {
    assert.equal(step.status, "planning");
    for (const value of Object.values(step.plan))
      assert.ok(value.length === 3 && value.every((v) => v.length > 0));
    assert.ok(
      rag.steps.findIndex((s) => s.id === step.previousStep) <
        rag.steps.indexOf(step),
    );
    assert.ok(rag.steps.some((s) => s.id === step.previousStep));
  }
});

for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(`${locale}: RAG discovery resolves original URLs and keeps planned work out of published content`, () => {
    const data = read(`../generated/${locale}.json`);
    const prefix = locale === "zh-CN" ? "" : "/" + locale;
    assert.ok(data.routes.includes("docs/rag"));
    const landing = data.documents.find((d) => d.route === "docs/rag");
    assert.ok(landing.frontMatter.landing);
    assert.match(
      landing.metadata.title,
      locale === "en" ? /Retrieval/ : locale === "zh-TW" ? /檢索/ : /检索/,
    );
    const index = data.globalData["content-index"].entries;
    const articles = filterWriting(
      index.filter((e) => e.type === "doc"),
      writingFilters("?domain=rag"),
    );
    assert.deepEqual(
      articles.map((e) => e.stepId).sort(),
      [...published].sort(),
    );
    for (const entry of articles) {
      assert.equal(entry.href, `${prefix}/docs/ai-apps/${entry.stepId}`);
      assert.equal(
        entry.translationStatus,
        locale === "zh-CN" ? "ORIGINAL" : "AI_TRANSLATED",
      );
      assert.ok(
        data.globalData["learning-index"].entries.some(
          (e) => e.stepId === entry.stepId && e.domain === "rag",
        ),
      );
    }
    for (const step of rag.steps.filter((s) => !s.doc))
      assert.ok(
        !data.globalData["learning-index"].entries.some(
          (e) => e.stepId === step.id,
        ),
      );
    const experiment = index.find((e) => e.id === "lab:retrieval-eval");
    assert.equal(experiment.domain, "rag");
    assert.equal(experiment.status, "running");
    assert.ok(index.some((e) => e.id === "doc:" + rag.synthesisDoc));
  });
}
