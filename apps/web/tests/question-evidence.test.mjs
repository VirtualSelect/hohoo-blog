import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  questionEvidence,
  checkTimeoutClaim,
} from "../lib/question-evidence.mjs";

const root = new URL("../../../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");

test("question studio keeps archived negative results and pinned sources", () => {
  const evidence = questionEvidence(read);
  assert.deepEqual(
    evidence.java.map((row) => row.count),
    [2, 1, 2],
  );
  assert.deepEqual(
    evidence.cache.map((row) => [row.mode, row.total]),
    [
      ["full", 252.7],
      ["rehash", 682.7],
      ["frozen", 273.6],
    ],
  );
  assert.equal(evidence.robot.filter((row) => row.stable).length, 4);
  const overshooting = evidence.robot.find(
    (row) => row.mass === 2 && row.damping === 18,
  );
  assert.equal(overshooting.overshoot, 74);
  assert.equal(overshooting.stable, true);
  for (const source of Object.values(evidence.sources)) {
    assert.ok(fs.existsSync(new URL(`${source.doc.slice(1)}.md`, root)));
    assert.match(source.code, /\/tree\/[a-f0-9]{40}\//);
    assert.match(source.evidence, /\/[a-f0-9]{40}\/.*evidence/);
  }
});

test("changing an article measurement updates the exhibit without another data edit", () => {
  const evidence = questionEvidence((file) =>
    read(file).replace("| frozen | 273.6 |", "| frozen | 301.2 |"),
  );
  assert.equal(
    evidence.cache.find((row) => row.mode === "frozen").total,
    301.2,
  );
});

test("invalid results or unpinned sources stop generation instead of fabricating a fallback", () => {
  for (const replace of [
    (text) => text.replace("| frozen | 273.6 |", "| frozen | unknown |"),
    (text) => text.replace("| frozen | 273.6 |", "| rehash | 273.6 |"),
    (text) =>
      text.replace(
        "| 1kg | 18 | 0mm | <0.01mm | 是 |",
        "| 1kg | 18 | 0mm | <0.01mm | 待定 |",
      ),
    (text) => text.replaceAll(/\/tree\/[a-f0-9]{40}\//g, "/tree/main/"),
  ])
    assert.throws(() => questionEvidence((file) => replace(read(file))));
});

test("a real quote cannot bypass scope, revision or value checks", () => {
  const { registry } = questionEvidence(read);
  const source = (id) => registry.find((row) => row.id === id);
  assert.equal(checkTimeoutClaim(source("prod-v2"), 5000), "supported");
  assert.equal(checkTimeoutClaim(source("prod-v2"), 2000), "value");
  assert.equal(checkTimeoutClaim(source("prod-v1"), 2000), "revision");
  assert.equal(checkTimeoutClaim(source("dev-v2"), 12000), "scope");
  assert.equal(checkTimeoutClaim(source("billing-v2"), 5000), "scope");
});
