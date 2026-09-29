import test from "node:test";
import assert from "node:assert/strict";
import { intakeBudget, selectItems } from "../scripts/news/lib.mjs";
import { radarDay, radarDateTime } from "../src/utils/radar-date.mjs";

const config = {
  dailyLimit: 10,
  perSourceLimit: 2,
  pacedDailyBudget: true,
  freshnessFirst: true,
  sources: [{ id: "aihot", priority: 100, dailyLimit: "shared" }],
};
const item = (id, sourceId = "aihot", extra = {}) => ({
  id,
  sourceId,
  url: "https://example.com/" + id,
  title: "RAG retrieval evaluation " + id,
  publishedAt: "2026-09-29T00:00:00.000Z",
  collectedAt: "2026-09-29T00:10:00.000Z",
  ...extra,
});

test("shared AIHOT budget follows global releases without a six-item cap across reruns", () => {
  const candidates = Array.from({ length: 30 }, (_, i) =>
    item(String(i), i < 20 ? "aihot" : i < 25 ? "other-a" : "other-b"),
  );
  const saved = [];
  for (const [hour, expected, primary] of [
    [0, 4, 4],
    [5, 4, 4],
    [6, 6, 6],
    [11, 6, 6],
    [12, 8, 8],
    [17, 8, 8],
    [18, 10, 10],
    [23, 10, 10],
  ]) {
    const now = new Date(`2026-09-29T${String(hour).padStart(2, "0")}:30:00Z`);
    const reasons = [];
    saved.push(...selectItems(candidates, saved, config, now, reasons));
    assert.equal(saved.length, expected);
    assert.equal(saved.filter((x) => x.sourceId === "aihot").length, primary);
    assert.equal(selectItems(candidates, saved, config, now).length, 0);
    if (hour === 0)
      assert.ok(reasons.some((x) => x.reason === "reserved-for-later"));
  }
});

test("shared source only fills remaining global slots, including slots spent by other sources", () => {
  const now = new Date("2026-09-29T18:30:00Z");
  const candidates = Array.from({ length: 12 }, (_, i) => item("candidate" + i));
  const existing = Array.from({ length: 5 }, (_, i) =>
    item("saved" + i, i < 2 ? "aihot" : "other-" + i),
  );
  const selected = selectItems(candidates, existing, config, now);
  assert.equal(selected.length, 5);
  const saved = [...existing, ...selected];
  assert.equal(saved.length, 10);
  assert.equal(saved.filter((x) => x.sourceId === "aihot").length, 7);
  assert.equal(selectItems(candidates, saved, config, now).length, 0);
  assert.equal(selectItems(candidates, [], { ...config, dailyLimit: 7 }, now).length, 7);
});

test("shared quota does not guarantee AIHOT slots ahead of more relevant sources", () => {
  const now = new Date("2026-09-29T18:30:00Z");
  const broad = item("broad", "aihot", { title: "LLM training update" });
  const focused = item("focused", "other-a");
  assert.deepEqual(
    selectItems([broad, focused], [], { ...config, dailyLimit: 1 }, now).map((x) => x.id),
    ["focused"],
  );
});

test("already-full days are not retroactively freed and UTC midnight resets the budget", () => {
  const saved = Array.from({ length: 10 }, (_, i) => item("old" + i));
  const morning = new Date("2026-09-29T01:00:00Z");
  assert.equal(intakeBudget(saved, config, morning).available, 0);
  const reasons = [];
  assert.deepEqual(
    selectItems([item("new")], saved, config, morning, reasons),
    [],
  );
  assert.equal(reasons[0].reason, "daily-limit");
  assert.equal(
    intakeBudget(saved, config, new Date("2026-09-30T00:00:00Z")).available,
    4,
  );
});

test("fresh publication day precedes old high-score backlog; research fit still orders the same day", () => {
  const now = new Date("2026-09-29T18:00:00Z");
  const old = item("old", "aihot", { publishedAt: "2026-09-28T23:59:59Z" });
  const fresh = item("fresh", "other-a", { title: "LLM training update" });
  const focus = item("focus", "other-b");
  assert.deepEqual(
    selectItems([old, fresh, focus], [], { ...config, dailyLimit: 3 }, now).map(
      (x) => x.id,
    ),
    ["focus", "fresh", "old"],
  );
});

test("source reservations and fixed source caps remain independent of global headroom", () => {
  const now = new Date("2026-09-29T00:30:00Z"),
    reasons = [];
  const candidates = Array.from({ length: 5 }, (_, i) =>
    item("s" + i, "other-a"),
  );
  assert.equal(selectItems(candidates, [], config, now, reasons).length, 1);
  assert.ok(reasons.some((x) => x.reason === "source-reserved-for-later"));
  assert.equal(
    selectItems(candidates, [], config, new Date("2026-09-29T18:00:00Z"))
      .length,
    2,
  );
});

test("radar display uses explicit UTC+8 across day and year boundaries without changing timestamps", () => {
  assert.equal(radarDay("2026-09-28T15:59:59Z"), "2026-09-28");
  assert.equal(radarDay("2026-09-28T16:00:00Z"), "2026-09-29");
  assert.equal(radarDateTime("2026-12-31T23:30:00Z"), "2027-01-01 07:30");
  assert.equal(radarDay("bad"), "");
});
