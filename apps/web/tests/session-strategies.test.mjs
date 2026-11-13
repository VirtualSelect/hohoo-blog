import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  sessionTrace,
  sessionViewUrl,
  readSessionView,
  defaultSessionView,
} from "../lib/session-strategies.mjs";
import { sessionStrategyEvidence } from "../lib/session-evidence.mjs";
const root = new URL("../../../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");

test("serial dispatch waits for A and captures its committed pair before B", () => {
  for (const scenario of ["a-first", "b-first", "b-fails"]) {
    const result = sessionTrace("serial", scenario);
    assert.deepEqual(result.snapshots.B, ["A"]);
    assert.deepEqual(
      result.history,
      scenario === "b-fails" ? ["A"] : ["A", "B"],
    );
    assert(
      result.events.findIndex(
        (e) => e.request === "A" && e.action === "commit",
      ) <
        result.events.findIndex(
          (e) => e.request === "B" && e.action === "start",
        ),
    );
  }
});
test("optimistic commits accept the first valid reply, not necessarily the last-started request", () => {
  const firstA = sessionTrace("first-commit", "a-first");
  const firstB = sessionTrace("first-commit", "b-first");
  assert.deepEqual(firstA.history, ["A"]);
  assert.deepEqual(firstA.outcomes, { A: "COMMITTED", B: "STALE" });
  assert.deepEqual(firstB.history, ["B"]);
  assert.deepEqual(firstA.snapshots.B, []);
  const failedB = sessionTrace("first-commit", "b-fails");
  assert.deepEqual(failedB.history, ["A"]);
  assert.equal(failedB.outcomes.B, "FAILED");
});
test("latest intention invalidates A on B start, including when B later fails", () => {
  for (const scenario of ["a-first", "b-first", "b-fails"]) {
    const result = sessionTrace("latest-start", scenario);
    assert.equal(result.outcomes.A, "STALE");
    assert.deepEqual(result.snapshots.B, []);
    assert.deepEqual(result.history, scenario === "b-fails" ? [] : ["B"]);
  }
});
test("session views share across locales, preserve unrelated filters and reject invalid choices", () => {
  const view = { policy: "first-commit", scenario: "b-fails" };
  assert.equal(
    sessionViewUrl("https://huhohoo.com/en/docs/ai-apps?ref=learn#old", view),
    "/en/docs/ai-apps?ref=learn&sessionPolicy=first-commit&sessionCase=b-fails#java-session-guide",
  );
  assert.deepEqual(
    readSessionView("?sessionPolicy=first-commit&sessionCase=b-fails"),
    view,
  );
  assert.deepEqual(
    readSessionView("?sessionPolicy=bad&sessionCase=bad"),
    defaultSessionView,
  );
  assert.throws(() => sessionTrace("bad", "b-first"));
  assert.throws(() =>
    sessionViewUrl("https://huhohoo.com/docs/ai-apps", {
      policy: "bad",
      scenario: "a-first",
    }),
  );
});
test("each modeled strategy points to its own archived code and evidence", () => {
  const source = sessionStrategyEvidence(read);
  for (const [id, demo] of [
    ["serial", "05-transactional-chat"],
    ["first-commit", "06-reliable-workflows"],
    ["latest-start", "09-stream-session"],
  ]) {
    assert(source.sources[id].code.includes(demo));
    assert.match(source.sources[id].code, /\/tree\/[a-f0-9]{40}\//);
    assert(source.sources[id].evidence.includes("evidence"));
  }
  assert.match(source.correction, /1d5a9fad9607ec981094c19a2381475762cd0d23/);
  assert.throws(() =>
    sessionStrategyEvidence((file) =>
      read(file).replace("同会话串行（Demo 05）", "changed"),
    ),
  );
});
