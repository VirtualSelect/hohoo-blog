import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import tracks from "../../../data/learning-paths.json" with { type: "json" };
import { readingPosition, nextReadingStep } from "../lib/reading-paths.mjs";

test("article position follows chapter order while a focused study follows declared results", () => {
  const track = {
    chapters: [{ steps: ["start", "finish"] }],
    steps: [
      { id: "finish", doc: "finish" },
      { id: "study", doc: "study", followUps: ["doc:finish"] },
      { id: "start", doc: "start" },
      { id: "plan", doc: "not-published" },
    ],
  };
  const available = new Set(["start", "study", "finish"]);
  const position = readingPosition(track, "start", available);
  assert.equal(position.kind, "core");
  assert.equal(position.index, 0);
  assert.deepEqual(
    position.core.map((step) => step.id),
    ["start", "finish"],
  );
  assert.equal(nextReadingStep(track, "start", available).id, "finish");
  assert.equal(nextReadingStep(track, "finish", available), null);
  assert.equal(readingPosition(track, "study", available).kind, "study");
  assert.equal(readingPosition(track, "study", available).index, null);
  assert.equal(nextReadingStep(track, "study", available).id, "finish");
  assert.equal(readingPosition(track, "plan", available), null);
  assert.equal(readingPosition(track, "unknown", available), null);
  assert.equal(readingPosition(null, "start", available), null);
  assert.equal(readingPosition(track, "start", new Set(["finish"])), null);
  assert.equal(readingPosition(track, "finish", new Set(["finish"])).index, 0);
});

for (const locale of ["zh-CN", "en", "zh-TW"]) {
  const data = JSON.parse(
    fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
  );
  const entries = data.globalData["learning-index"].entries;
  const available = new Set(entries.map((entry) => entry.stepId));
  test(`${locale}: main articles and focused studies retain different reading roles`, () => {
    const java = tracks.find((track) => track.domain === "ai-apps");
    const durable = readingPosition(java, "java-durable-turns", available);
    assert.equal(durable.kind, "core");
    assert.equal(durable.index, 4);
    assert.equal(durable.core.length, 6);
    assert.equal(
      durable.core[durable.index - 1].id,
      "java-stream-session-ownership",
    );
    assert.equal(
      durable.core[durable.index + 1].id,
      "java-recovery-reconciliation",
    );
    const cancellation = readingPosition(
      java,
      "java-transport-cancellation",
      available,
    );
    assert.equal(cancellation.kind, "study");
    assert.equal(cancellation.index, null);
    assert.equal(
      nextReadingStep(java, "java-transport-cancellation", available).id,
      "java-retry-deadline",
    );
    const llm = tracks.find((track) => track.domain === "llm");
    assert.equal(
      readingPosition(llm, "kv-cache-equivalence", available).index,
      1,
    );
    const embodied = tracks.find((track) => track.domain === "embodied-ai");
    assert.equal(
      readingPosition(embodied, "mujoco-recovery-ablation", available).kind,
      "study",
    );
    for (const track of tracks) {
      for (const step of track.steps.filter((step) => available.has(step.id))) {
        const position = readingPosition(track, step.id, available);
        const follows = nextReadingStep(track, step.id, available);
        if (position.kind === "core") {
          assert.equal(position.core[position.index].id, step.id);
          assert.equal(follows?.id, position.core[position.index + 1]?.id);
        } else {
          assert.equal(position.index, null);
          if (follows) assert.ok(step.followUps.includes("doc:" + follows.doc));
        }
      }
    }
  });
}
