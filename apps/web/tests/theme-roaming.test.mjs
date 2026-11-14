import test from "node:test";
import assert from "node:assert/strict";
import { designThemes } from "../lib/design-themes.mjs";
import {
  roamingPreferenceKey,
  validRoamingDay,
  readRoamingState,
  localDayKey,
  chooseRoamingTheme,
  recordDesignVisit,
  resolveDailyDesign,
} from "../lib/theme-roaming.mjs";

const ids = designThemes.map((theme) => theme.id);

test("roaming is opt-in and malformed or future-version browser records stay disabled", () => {
  assert.equal(roamingPreferenceKey, "huhohoo.roaming.v1");
  const empty = readRoamingState(null);
  assert.equal(empty.daily, false);
  for (const raw of [
    undefined,
    {},
    "",
    "{",
    "null",
    "1",
    "[]",
    "true",
    '{"version":2,"daily":true}',
    '{"daily":true}',
    "x".repeat(5000),
  ])
    assert.deepEqual(readRoamingState(raw), empty);
  const restored = readRoamingState(
    JSON.stringify({
      version: 1,
      daily: true,
      day: "2026-11-14",
      dailyId: "garden",
      previousId: "photo",
      visited: ["garden", "garden", "space", "__proto__", "toString", 1, {}],
      extra: "not persisted",
    }),
  );
  assert.deepEqual(restored, {
    version: 1,
    daily: true,
    day: "2026-11-14",
    dailyId: "garden",
    previousId: "photo",
    visited: ["garden", "space"],
  });
  for (const update of [
    { day: "2026-02-30" },
    { dailyId: "__proto__" },
    { daily: 1 },
  ]) {
    const invalid = readRoamingState(
      JSON.stringify({ ...restored, ...update }),
    );
    assert.equal(invalid.daily, false);
    assert.equal(invalid.day, null);
    assert.equal(invalid.dailyId, null);
    assert.deepEqual(invalid.visited, ["garden", "space"]);
  }
});

test("daily keys use the visitor's local calendar and reject normalized impossible dates", () => {
  assert.equal(localDayKey(new Date(2026, 0, 2, 0, 1)), "2026-01-02");
  assert.equal(localDayKey(new Date(2026, 0, 2, 23, 59)), "2026-01-02");
  assert.equal(localDayKey(new Date(NaN)), null);
  assert.equal(validRoamingDay("2028-02-29"), true);
  for (const day of [
    null,
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-1-02",
    "2026-11-14T00:00:00Z",
  ])
    assert.equal(validRoamingDay(day), false, String(day));
});

test("random travel reaches every unseen theme without ever choosing the current view", () => {
  let state = recordDesignVisit(readRoamingState(null), "garden", "garden");
  let current = "garden";
  const journey = [current];
  for (let i = 0; i < 7; i++) {
    const next = chooseRoamingTheme(current, state.visited, () => 0.9999);
    assert.notEqual(next, current);
    assert.ok(!journey.includes(next));
    state = recordDesignVisit(state, next, current);
    current = next;
    journey.push(next);
  }
  assert.equal(new Set(journey).size, 8);
  assert.equal(state.visited.length, 8);
  for (const id of ids)
    for (const random of [0, 0.25, 0.999999, 1, NaN, -1, Infinity]) {
      const next = chooseRoamingTheme(id, ids, () => random);
      assert.ok(ids.includes(next));
      assert.notEqual(next, id);
    }
});

test("manual visits preserve an undo destination, stop daily scenery and never mutate input", () => {
  const initial = recordDesignVisit(readRoamingState(null), "garden", "clear", {
    daily: true,
    day: "2026-11-14",
  });
  const before = structuredClone(initial);
  const manual = recordDesignVisit(initial, "photo", "garden");
  assert.equal(manual.daily, false);
  assert.equal(manual.day, null);
  assert.equal(manual.dailyId, null);
  assert.equal(manual.previousId, "garden");
  const undo = recordDesignVisit(manual, manual.previousId, "photo");
  assert.equal(undo.previousId, "photo");
  assert.deepEqual(undo.visited, ["clear", "garden", "photo"]);
  assert.deepEqual(initial, before);
  const stay = recordDesignVisit(initial, "garden", "garden");
  assert.equal(stay.previousId, "clear");
  assert.equal(stay.daily, false);
});

test("enabling daily scenery keeps today's view and next-day selection stays stable", () => {
  const start = recordDesignVisit(readRoamingState(null), "garden", "garden", {
    daily: true,
    day: "2026-11-14",
  });
  const today = resolveDailyDesign(start, "garden", "2026-11-14");
  assert.equal(today.designId, "garden");
  assert.equal(today.changed, false);
  const tomorrow = resolveDailyDesign(start, "garden", "2026-11-15");
  assert.notEqual(tomorrow.designId, "garden");
  assert.equal(tomorrow.changed, true);
  assert.equal(tomorrow.state.dailyId, tomorrow.designId);
  assert.equal(tomorrow.state.previousId, "garden");
  assert.deepEqual(resolveDailyDesign(start, "garden", "2026-11-15"), tomorrow);
  const sameDay = resolveDailyDesign(
    tomorrow.state,
    tomorrow.designId,
    "2026-11-15",
  );
  assert.equal(sameDay.changed, false);
  assert.equal(sameDay.designId, tomorrow.designId);
  assert.equal(
    resolveDailyDesign(start, "garden", "not a date").changed,
    false,
  );
});

test("a newer explicit theme defeats an older daily record instead of silently resetting the reader", () => {
  const daily = recordDesignVisit(readRoamingState(null), "garden", "clear", {
    daily: true,
    day: "2026-11-13",
  });
  const result = resolveDailyDesign(daily, "map", "2026-11-14");
  assert.equal(result.designId, "map");
  assert.equal(result.state.daily, false);
  assert.equal(result.state.dailyId, null);
  const tomorrow = resolveDailyDesign(result.state, "map", "2026-11-15");
  assert.equal(tomorrow.designId, "map");
  assert.equal(tomorrow.changed, false);
});
