import test from "node:test";
import assert from "node:assert/strict";
import { initialRobot, stepRobot } from "../lib/robot-program.mjs";
import { DEFAULT_WALLS, GOAL } from "../lib/grid-path.mjs";
import { rankTeachingDocs } from "../lib/retrieval-ranking.mjs";
import { readingForks } from "../lib/reading-forks.mjs";
test("robot stops on collision without advancing its program counter", () => {
  const s = initialRobot();
  const blocked = stepRobot(s, ["forward"], [15]);
  assert.equal(blocked.position, 20);
  assert.equal(blocked.cursor, 0);
  assert.equal(blocked.blocked, true);
  assert.deepEqual(stepRobot(blocked, ["forward"], []), blocked);
  const west = stepRobot(s, ["left"], []);
  assert.equal(west.direction, 3);
  assert.equal(
    stepRobot({ ...west, cursor: 0 }, ["forward"], []).blocked,
    true,
  );
});
test("turns and repeated moves reach goal without crossing default walls", () => {
  const program = [
    ...Array(4).fill("forward"),
    "right",
    ...Array(4).fill("forward"),
  ];
  let state = initialRobot();
  for (const _ of program) state = stepRobot(state, program, DEFAULT_WALLS);
  assert.equal(state.position, GOAL);
  assert.equal(state.blocked, false);
  assert.deepEqual(stepRobot(state, program, DEFAULT_WALLS), state);
});
test("teaching weights surface lexical distractor and semantic evidence", () => {
  assert.equal(rankTeachingDocs(100)[0].id, "C");
  assert.equal(rankTeachingDocs(0)[0].id, "A");
  assert.deepEqual(rankTeachingDocs(200), rankTeachingDocs(100));
});
test("reading forks exclude drafts, self, untranslated and unrelated projects", () => {
  const entries = [
    {
      id: "self",
      type: "doc",
      status: "published",
      href: "/self",
      domain: "ai-apps",
    },
    {
      id: "draft",
      type: "doc",
      status: "learning",
      href: "/draft",
      domain: "ai-apps",
    },
    { id: "project", type: "project", status: "building", href: "/project" },
    {
      id: "missing",
      type: "doc",
      status: "published",
      href: "/missing",
      translationStatus: "MISSING",
      domain: "ai-apps",
    },
    {
      id: "real",
      type: "doc",
      status: "published",
      href: "/real",
      domain: "ai-apps",
    },
  ];
  const fork = readingForks(entries, "self", {
    domain: "ai-apps",
    related: ["project"],
    prerequisites: ["real", "draft"],
  });
  assert.deepEqual(
    fork.concepts.map((e) => e.id),
    ["real"],
  );
  assert.deepEqual(
    fork.practice.map((e) => e.id),
    ["project"],
  );
  assert.deepEqual(
    fork.deeper.map((e) => e.id),
    ["real"],
  );
  assert.deepEqual(readingForks(entries, "self", {}), {
    concepts: [],
    practice: [],
    deeper: [],
  });
});
