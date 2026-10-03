import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const routes = [
  "ai-apps/java-concurrent-history",
  "ai-apps/java-tool-boundary",
  "ai-apps/java-retrieval-evidence",
  "llm/causal-mask-lab",
  "llm/kv-cache-equivalence",
  "llm/sliding-cache-positions",
  "embodied-ai/mujoco-exit-actions",
  "embodied-ai/mujoco-release-verification",
  "embodied-ai/mujoco-recovery-budget",
];

for (const locale of ["zh-CN", "en", "zh-TW"]) {
  test(`${locale}: nine research articles retain sources, relationships and translated bodies`, () => {
    const data = read(`../generated/${locale}.json`);
    const entries = data.globalData["content-index"].entries;
    for (const route of routes) {
      const entry = entries.find((x) => x.id === `doc:${route}`);
      assert.ok(entry, route);
      assert.equal(entry.status, "published");
      assert.equal(
        entry.translationStatus,
        locale === "zh-CN" ? "ORIGINAL" : "AI_TRANSLATED",
      );
      const doc = data.documents.find((x) => x.route === `docs/${route}`);
      assert.ok(doc && !doc.sourceFallback);
      assert.ok(
        doc.headings.length >= 6,
        `${route}: missing research sections`,
      );
      assert.match(
        doc.html,
        /github\.com\/VirtualSelect\/.+\/tree\/[a-f0-9]{40}\//,
      );
      const prefix = locale === "zh-CN" ? "" : `/${locale}`;
      for (const match of doc.html.matchAll(
        /href="(\/[^"#?]*)(?:[?#][^"]*)?"/g,
      ))
        assert.ok(
          data.routes.includes(match[1].slice(prefix.length + 1)),
          match[1],
        );
      for (const match of doc.html.matchAll(/<img\b[^>]+>/g)) {
        assert.match(match[0], /width="1500"/);
        assert.match(match[0], /height="600"/);
        assert.match(match[0], /loading="lazy"/);
      }
    }
  });
}

test("partial tool/RAG work and author milestones are not promoted to completed", () => {
  const labs = read("../../../data/experiments.json");
  for (const id of ["tool-eval", "retrieval-eval"])
    assert.equal(labs.find((x) => x.id === id).status, "running");
  const journey = read("../../../data/journey-labs.json");
  assert.equal(journey.labs.find((x) => x.id === "VL01").status, "learning");
  assert.equal(
    labs.find((x) => x.id === "context-position").status,
    "inconclusive",
  );
});
