import test from "node:test";
import assert from "node:assert/strict";
import {
  collectBackpack,
  parseBackpack,
  planRestore,
  restoreBackpack,
  practiceKey,
} from "../lib/backpack.mjs";
import { streamSnapshot } from "../lib/stream-demo.mjs";
test("backpack preserves current inbox and learning schemas without collecting unrelated fields", () => {
  const records = {
    "huhohoo.reading.v2": JSON.stringify({
      version: 2,
      saved: ["note:token"],
      read: [],
      reading: ["note:token"],
      savedAt: { "note:token": "2026-09-19T00:00:00Z" },
    }),
    "huhohoo.learning.v1": JSON.stringify({
      version: 1,
      saved: ["first-call"],
      items: {
        "first-call": { status: "reading", updatedAt: "2026-09-19T00:00:00Z" },
      },
      lastOpened: "first-call",
    }),
  };
  const envelope = JSON.stringify({
    version: 1,
    kind: "huhohoo-backpack",
    records,
  });
  assert.deepEqual(parseBackpack(envelope).records, records);
  assert.throws(() =>
    parseBackpack(
      JSON.stringify({
        version: 1,
        kind: "huhohoo-backpack",
        records: {
          "huhohoo.learning.v1": JSON.stringify({
            version: 1,
            saved: [],
            items: {},
            secret: "unexpected",
          }),
        },
      }),
    ),
  );
});
const key = "huhohoo.reflection.v1:docs/ai-apps/java-first-llm";
const note = (text) =>
  JSON.stringify({ version: 1, takeaway: text, question: "", next: "" });
function storage(initial = {}, failAt) {
  const map = new Map(Object.entries(initial));
  let writes = 0;
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i],
    getItem: (k) => map.get(k) ?? null,
    setItem(k, v) {
      if (++writes === failAt) throw Error("quota");
      map.set(k, v);
    },
    removeItem: (k) => map.delete(k),
  };
}
test("backpack round trip includes only learning data and preserves private text", () => {
  const store = storage({
    [key]: note("my note"),
    [practiceKey]: JSON.stringify({ version: 1, completed: ["request"] }),
    "huhohoo.theme.v1": "dark",
    secret: "excluded",
  });
  const backup = collectBackpack(store);
  assert.deepEqual(Object.keys(backup.records), [key, practiceKey]);
  const target = storage();
  assert.equal(
    restoreBackpack(
      target,
      planRestore(target, parseBackpack(JSON.stringify(backup))),
    ),
    2,
  );
  assert.equal(target.getItem(key), note("my note"));
});
test("backpack rejects unknown schemas, foreign keys, malformed notes and oversized input", () => {
  const wrap = (records) =>
    JSON.stringify({ version: 1, kind: "huhohoo-backpack", records });
  for (const value of [
    wrap({ secret: '"abc"' }),
    wrap({ [key]: '{"version":2}' }),
    wrap({ [practiceKey]: '{"version":1,"completed":["fake"]}' }),
    JSON.stringify({ version: 2, kind: "huhohoo-backpack", records: {} }),
    "x".repeat(2000001),
  ])
    assert.throws(() => parseBackpack(value));
  assert.throws(() => collectBackpack(storage({ [key]: "corrupt" })));
});
test("conflicts keep local by default; replacement is explicit and detects concurrent changes", () => {
  const store = storage({ [key]: note("local") }),
    backup = { records: { [key]: note("incoming") } };
  assert.equal(restoreBackpack(store, planRestore(store, backup)), 0);
  assert.equal(store.getItem(key), note("local"));
  const plan = planRestore(store, backup, true);
  store.setItem(key, note("another tab"));
  assert.throws(() => restoreBackpack(store, plan), /changed/);
  assert.equal(restoreBackpack(store, planRestore(store, backup, true)), 1);
  assert.equal(store.getItem(key), note("incoming"));
});
test("storage failure rolls back previously written records", () => {
  const store = storage({ [key]: note("local") }, 2);
  const plan = planRestore(
    store,
    {
      records: {
        [key]: note("incoming"),
        [practiceKey]: JSON.stringify({ version: 1, completed: [] }),
      },
    },
    true,
  );
  assert.throws(() => restoreBackpack(store, plan), /restore-failed/);
  assert.equal(store.getItem(key), note("local"));
  assert.equal(store.getItem(practiceKey), null);
});
test("cancelled and disconnected partial streams are never marked complete", () => {
  const chunks = ['{"answer":', '"Java', ' API"', "}"];
  assert.throws(() => JSON.parse(streamSnapshot(chunks, 2).partial));
  assert.equal(
    JSON.parse(streamSnapshot(chunks, 4).buffered).answer,
    "Java API",
  );
  for (const state of ["cancelled", "disconnected"]) {
    const v = streamSnapshot(chunks, 2, state);
    assert.equal(v.complete, false);
    assert.equal(v.buffered, "");
    assert.ok(v.partial);
  }
});
