import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import tracks from "../../../data/learning-paths.json" with { type: "json" };
import {
  emptyProgress,
  parseProgress,
  migrateProgress,
  updateProgress,
} from "../../../src/utils/learning-progress.ts";
import {
  savedLearningEntries,
  compareReadingEntries,
} from "../lib/reading-list.mjs";
import {
  collectBackpack,
  parseBackpack,
  planRestore,
  restoreBackpack,
} from "../lib/backpack.mjs";

const earlier = "2026-11-01T00:00:00.000Z";
const later = "2026-11-02T00:00:00.000Z";

test("new saves retain their actual action time across reading, removal and re-saving", () => {
  const original = emptyProgress();
  const first = updateProgress(original, "a", "saved", earlier);
  const second = updateProgress(first, "b", "saved", later);
  assert.deepEqual(original, emptyProgress());
  assert.deepEqual(first.savedAt, { a: earlier });
  assert.deepEqual(second.savedAt, { a: earlier, b: later });
  assert.deepEqual(second.items, {});
  assert.equal(second.lastOpened, undefined);
  const read = updateProgress(second, "a", "reading", later);
  const completed = updateProgress(read, "a", "completed", later);
  assert.deepEqual(completed.savedAt, second.savedAt);
  const removed = updateProgress(completed, "a", "saved", later);
  assert.deepEqual(removed.savedAt, { b: later });
  assert.equal(removed.items.a.status, "completed");
  assert.deepEqual(completed.savedAt, { a: earlier, b: later });
  const resaved = updateProgress(removed, "a", "saved", later);
  assert.equal(resaved.savedAt.a, later);
  const empty = updateProgress(
    updateProgress(resaved, "a", "saved"),
    "b",
    "saved",
  );
  assert.equal(empty.savedAt, undefined);
});

test("old saves gain no invented date and malformed date metadata cannot remove a bookmark", () => {
  const legacy = parseProgress(
    JSON.stringify({
      version: 1,
      saved: ["a"],
      items: { a: { status: "reading", updatedAt: later } },
      lastOpened: "a",
    }),
    ["a", "b"],
  );
  assert.equal(legacy.savedAt, undefined);
  const added = updateProgress(legacy, "b", "saved", later);
  assert.equal(added.savedAt.a, undefined);
  assert.equal(added.savedAt.b, later);
  assert.equal(
    migrateProgress(JSON.stringify({ saved: ["a"], completed: ["a"] }), ["a"])
      .savedAt,
    undefined,
  );
  for (const metadata of [
    null,
    [],
    "invalid",
    { a: "not-a-date", b: earlier },
  ]) {
    const parsed = parseProgress(
      JSON.stringify({
        version: 1,
        saved: ["a"],
        items: {},
        savedAt: metadata,
      }),
      ["a", "b"],
    );
    assert.deepEqual(parsed.saved, ["a"]);
    assert.equal(parsed.savedAt, undefined);
  }
  const parsed = parseProgress(
    JSON.stringify({
      version: 1,
      saved: ["a"],
      items: {},
      savedAt: { a: earlier, b: later, unknown: later },
    }),
    ["a", "b"],
  );
  assert.deepEqual(parsed.savedAt, { a: earlier });
  const badClock = updateProgress(emptyProgress(), "a", "saved", "not-a-date");
  assert.deepEqual(badClock.saved, ["a"]);
  assert.equal(badClock.savedAt, undefined);
});

test("saved ordering uses actual instants across offsets and leaves unknown dates last", () => {
  const offset = {
    id: "offset",
    title: "Zulu",
    savedAt: "2026-11-12T07:00:00+08:00",
  };
  const utc = { id: "utc", title: "Alpha", savedAt: "2026-11-12T00:00:00Z" };
  const unknown = { id: "unknown", title: "Unknown" };
  const invalid = { id: "invalid", title: "Invalid", savedAt: "not-a-date" };
  const rows = [offset, utc, unknown, invalid];
  assert.deepEqual(
    rows
      .toSorted((a, b) => compareReadingEntries(a, b, "newest"))
      .map((x) => x.id),
    ["utc", "offset", "invalid", "unknown"],
  );
  assert.deepEqual(
    rows
      .toSorted((a, b) => compareReadingEntries(a, b, "oldest"))
      .map((x) => x.id),
    ["offset", "utc", "invalid", "unknown"],
  );
  assert.ok(
    compareReadingEntries(
      { title: "Epoch", savedAt: "1970-01-01T00:00:00Z" },
      unknown,
      "oldest",
    ) < 0,
  );
  assert.ok(
    compareReadingEntries(
      { title: "Short", minutes: 2, savedAt: earlier },
      { title: "Long", minutes: 20, savedAt: later },
      "shortest",
    ) < 0,
  );
  assert.ok(
    compareReadingEntries(
      { title: "Alpha", savedAt: "2026-11-12T08:00:00+08:00" },
      { title: "Zulu", savedAt: "2026-11-12T00:00:00Z" },
    ) < 0,
  );
});

for (const locale of ["zh-CN", "en", "zh-TW"]) {
  test(`${locale}: a later saved real article sorts ahead of an earlier alphabetical title`, () => {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const state = updateProgress(
      updateProgress(emptyProgress(), "first-call", "saved", earlier),
      "structured-output",
      "saved",
      later,
    );
    const rows = savedLearningEntries(
      tracks,
      data.globalData["learning-index"].entries,
      state,
      locale,
    );
    assert.deepEqual(
      rows
        .toSorted((a, b) => compareReadingEntries(a, b, "newest", locale))
        .map((x) => x.id),
      ["structured-output", "first-call"],
    );
    assert.deepEqual(
      rows
        .toSorted((a, b) => compareReadingEntries(a, b, "oldest", locale))
        .map((x) => x.id),
      ["first-call", "structured-output"],
    );
    assert.equal(rows.find((x) => x.id === "first-call").savedAt, earlier);
    const broken = savedLearningEntries(
      tracks,
      data.globalData["learning-index"].entries,
      { ...state, savedAt: { "first-call": "invalid" } },
      locale,
    );
    assert.ok(broken.every((x) => x.savedAt === undefined));
  });
}

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index],
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test("learning save dates survive an exact backup/restore round trip with older undated records", () => {
  const key = "huhohoo.learning.v1";
  const old = {
    version: 1,
    saved: ["a"],
    items: { a: { status: "completed", updatedAt: earlier } },
    lastOpened: "a",
  };
  const state = updateProgress(
    parseProgress(JSON.stringify(old), ["a", "b"]),
    "b",
    "saved",
    later,
  );
  const raw = JSON.stringify(state);
  const source = storage({ [key]: raw, "unrelated.preference": "keep out" });
  const backup = parseBackpack(JSON.stringify(collectBackpack(source)));
  assert.deepEqual(Object.keys(backup.records), [key]);
  const destination = storage();
  assert.equal(
    restoreBackpack(destination, planRestore(destination, backup)),
    1,
  );
  assert.equal(destination.getItem(key), raw);
  const restored = parseProgress(destination.getItem(key), ["a", "b"]);
  assert.deepEqual(restored.savedAt, { b: later });
  assert.deepEqual(restored.items, old.items);
  assert.equal(restored.lastOpened, "a");
  assert.doesNotThrow(() =>
    collectBackpack(storage({ [key]: JSON.stringify(old) })),
  );
});

test("backups still reject malformed, orphaned or unsafe learning date records", () => {
  for (const savedAt of [
    null,
    [],
    12,
    "invalid",
    { a: "invalid" },
    { b: earlier },
    { constructor: earlier },
  ]) {
    assert.throws(() =>
      parseBackpack(
        JSON.stringify({
          version: 1,
          kind: "huhohoo-backpack",
          records: {
            "huhohoo.learning.v1": JSON.stringify({
              version: 1,
              saved: ["a"],
              items: {},
              savedAt,
            }),
          },
        }),
      ),
    );
  }
});

test("the existing news inbox still requires a valid saved-date map", () => {
  const envelope = (savedAt) =>
    JSON.stringify({
      version: 1,
      kind: "huhohoo-backpack",
      records: {
        "huhohoo.reading.v2": JSON.stringify({
          version: 2,
          saved: ["note:a"],
          read: [],
          reading: [],
          savedAt,
        }),
      },
    });
  assert.doesNotThrow(() => parseBackpack(envelope({ "note:a": earlier })));
  assert.doesNotThrow(() => parseBackpack(envelope({})));
  for (const dates of [
    undefined,
    null,
    [],
    { "note:a": "invalid" },
    { "note:b": earlier },
  ])
    assert.throws(() => parseBackpack(envelope(dates)));
});
