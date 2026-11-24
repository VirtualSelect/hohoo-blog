import test from "node:test";
import assert from "node:assert/strict";
import {
  intakeBudget,
  selectItems,
  fetchSource,
} from "../scripts/news/lib.mjs";
import { radarDay, radarDateTime } from "../src/utils/radar-date.mjs";
import { assessRelevance } from "../scripts/news/relevance.mjs";
import {
  collectionDiagnostics,
  formatCollectionReport,
} from "../scripts/news/diagnostics.mjs";

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
  const candidates = Array.from({ length: 12 }, (_, i) =>
    item("candidate" + i),
  );
  const existing = Array.from({ length: 5 }, (_, i) =>
    item("saved" + i, i < 2 ? "aihot" : "other-" + i),
  );
  const selected = selectItems(candidates, existing, config, now);
  assert.equal(selected.length, 5);
  const saved = [...existing, ...selected];
  assert.equal(saved.length, 10);
  assert.equal(saved.filter((x) => x.sourceId === "aihot").length, 7);
  assert.equal(selectItems(candidates, saved, config, now).length, 0);
  assert.equal(
    selectItems(candidates, [], { ...config, dailyLimit: 7 }, now).length,
    7,
  );
});

test("shared quota does not guarantee AIHOT slots ahead of more relevant sources", () => {
  const now = new Date("2026-09-29T18:30:00Z");
  const broad = item("broad", "aihot", { title: "LLM training update" });
  const focused = item("focused", "other-a");
  assert.deepEqual(
    selectItems([broad, focused], [], { ...config, dailyLimit: 1 }, now).map(
      (x) => x.id,
    ),
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

const replayTime = new Date("2026-11-24T18:00:00Z");
const replaySource = {
  id: "aihot",
  name: "AIHOT",
  hosts: ["aihot.news"],
  feed: "https://aihot.news/feed/full.xml",
  parserVersion: "aihot-full-v2",
};
const replayItem = (id, date = "2026-11-24T12:00:00Z") =>
  `<item><title>RAG retrieval evaluation ${id}</title><link>https://aihot.news/items/${id}</link><pubDate>${date}</pubDate><description>LLM evaluation methods.</description></item>`;

async function replayCollection(entries, existing = [], overrides = {}) {
  const settings = { ...config, windowHours: 48, ...overrides };
  const report = {
    runAt: replayTime.toISOString(),
    windowHours: settings.windowHours,
    since: new Date(replayTime - settings.windowHours * 3600000).toISOString(),
    budget: intakeBudget(existing, settings, replayTime),
    sources: [],
    rejected: [],
    selected: [],
    notSelected: [],
  };
  let candidates = [];
  try {
    const result = await fetchSource(replaySource, replayTime, 14, async () => {
      if (entries instanceof Error) throw entries;
      return `<rss version="2.0"><channel><title>Replay</title>${entries}</channel></rss>`;
    });
    candidates = result.items;
    report.sources.push({
      source: "AIHOT",
      status: "ok",
      parserVersion: replaySource.parserVersion,
      eligible: candidates.length,
      skipped: result.skipped,
      feedCoverage: result.feedCoverage,
      inWindow: candidates.filter(
        (candidate) =>
          replayTime - new Date(candidate.publishedAt) <=
          settings.windowHours * 3600000,
      ).length,
    });
  } catch (error) {
    report.sources.push({
      source: "AIHOT",
      status: "failed",
      error: error.message,
    });
  }
  const relevant = candidates.filter((candidate) => {
    const result = assessRelevance(candidate);
    if (!result.accepted)
      report.rejected.push({ id: candidate.id, reason: result.reason });
    return result.accepted;
  });
  report.selected = selectItems(
    relevant,
    existing,
    settings,
    replayTime,
    report.notSelected,
  );
  report.diagnostics = collectionDiagnostics(
    report,
    relevant,
    existing,
    settings,
  );
  return report;
}

test("diagnostic replay: source failure cannot be presented as normal zero new items", async () => {
  const report = await replayCollection(new Error("Feed HTTP 503"));
  assert.equal(report.diagnostics.sourceHealth, "failed");
  assert.equal(report.diagnostics.selectionOutcome, "unknown");
  assert.match(formatCollectionReport(report), /来源全部失败，无法判断/);
  assert.doesNotMatch(formatCollectionReport(report), /正常零新增：/);
  report.sources.push({
    source: "Other",
    status: "ok",
    eligible: 0,
    skipped: 0,
    inWindow: 0,
  });
  report.diagnostics = collectionDiagnostics(report, [], [], config);
  assert.equal(report.diagnostics.sourceHealth, "partial-failure");
  assert.match(formatCollectionReport(report), /仅适用于成功读取的来源/);
});

test("diagnostic replay: exhausted budget with only duplicates is normal zero new, not quota blocking", async () => {
  const existing = Array.from({ length: 10 }, (_, i) => ({
    ...item(String(i)),
    url: "https://aihot.news/items/" + i,
    title: "RAG retrieval evaluation " + i,
    publishedAt: "2026-11-24T12:00:00Z",
    collectedAt: replayTime.toISOString(),
  }));
  const report = await replayCollection(replayItem("0"), existing);
  assert.equal(report.budget.remaining, 0);
  assert.equal(report.diagnostics.selectionOutcome, "no-new-eligible");
  assert.deepEqual(report.diagnostics.notSelectedReasons, { duplicate: 1 });
  assert.equal(report.diagnostics.quotaBlocked, 0);
  assert.match(formatCollectionReport(report), /正常零新增：/);
  assert.doesNotMatch(formatCollectionReport(report), /有合格候选被配额/);
});

test("diagnostic replay: a new eligible candidate actually blocked by quota is reported distinctly", async () => {
  const existing = Array.from({ length: 10 }, (_, i) => ({
    ...item("saved-" + i),
    collectedAt: replayTime.toISOString(),
  }));
  const report = await replayCollection(replayItem("new"), existing);
  assert.equal(report.diagnostics.selectionOutcome, "quota-blocked");
  assert.equal(report.diagnostics.quotaBlocked, 1);
  assert.deepEqual(report.diagnostics.notSelectedReasons, { "daily-limit": 1 });
  assert.match(
    formatCollectionReport(report),
    /有合格候选被配额或分时预留挡住/,
  );
  assert.equal(report.selected.length, 0);
});

test("diagnostic replay: old unarchived candidates expose unknown arrival, not an invented first-seen date", async () => {
  const oldDate = "2026-11-21T12:00:00Z";
  const archived = {
    ...item("archived"),
    title: "RAG retrieval evaluation archived",
    url: "https://aihot.news/items/archived",
    publishedAt: oldDate,
  };
  const report = await replayCollection(
    replayItem("old", oldDate) +
      replayItem("archived", oldDate) +
      replayItem("blocked", oldDate) +
      replayItem("too-old", "2026-11-01T12:00:00Z"),
    [archived],
    { blockedUrls: ["https://aihot.news/items/blocked"] },
  );
  assert.equal(report.diagnostics.selectionOutcome, "outside-window");
  const outside = report.diagnostics.outsideWindow;
  assert.equal(outside.relevantCount, 3);
  assert.equal(outside.unarchivedCount, 1);
  assert.equal(outside.firstSeenStatus, "not-recorded");
  assert.equal(outside.arrivalStatus, "unknown");
  assert.equal(outside.candidates[0].firstSeenAt, null);
  assert.equal(
    outside.candidates[0].publishedAt,
    new Date(oldDate).toISOString(),
  );
  assert.equal(outside.candidates[0].observedAt, replayTime.toISOString());
  assert.deepEqual(report.sources[0].feedCoverage, {
    itemCount: 4,
    inspectedCount: 4,
    truncated: false,
    oldestPublishedAt: "2026-11-01T12:00:00.000Z",
    newestPublishedAt: "2026-11-21T12:00:00.000Z",
  });
  assert.equal(report.sources[0].skipped, 1);
  assert.match(
    formatCollectionReport(report),
    /首见时间未记录，是否晚到无法确认/,
  );
  assert.match(formatCollectionReport(report), /不证明已覆盖完整回溯历史/);
  assert.equal(report.selected.length, 0);
});

test("diagnostic replay: an older version selected this run is not reported as missing", async () => {
  const report = await replayCollection(
    replayItem("same-url", "2026-11-21T12:00:00Z") + replayItem("same-url"),
  );
  assert.equal(report.selected.length, 1);
  assert.equal(report.diagnostics.outsideWindow.relevantCount, 1);
  assert.equal(report.diagnostics.outsideWindow.unarchivedCount, 0);
});
