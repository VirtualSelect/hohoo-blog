import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import tracks from "../../../data/learning-paths.json" with { type: "json" };
import {
  savedLearningEntries,
  compareReadingEntries,
} from "../lib/reading-list.mjs";
import {
  coreSteps,
  nextReadingStep,
  readLearningFilters,
  learningFilterUrl,
  readingGroups,
} from "../lib/reading-paths.mjs";

for (const locale of ["zh-CN", "en", "zh-TW"]) {
  const data = JSON.parse(
    fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
  );
  const entries = data.globalData["content-index"].entries;
  const published = data.globalData["learning-index"].entries;
  test(`${locale}: saved published articles retain localized titles, routes and sorting`, () => {
    const saved = published.map((entry) => entry.stepId);
    const rows = savedLearningEntries(
      tracks,
      entries,
      { saved, items: {} },
      locale,
    );
    assert.equal(rows.length, published.length);
    for (const row of rows) {
      const source = published.find((entry) => entry.stepId === row.id);
      assert.equal(row.title, source.title);
      assert.equal(row.href, source.permalink);
      assert.equal(row.minutes, source.minutes);
      assert.equal(row.planned, false);
      assert.equal(row.topic, source.domain);
    }
    // Every sort mode previously crashed when multiple saved steps lacked a title.
    for (const order of ["newest", "oldest", "shortest"]) {
      assert.equal(
        rows.toSorted((a, b) => compareReadingEntries(a, b, order, locale))
          .length,
        published.length,
      );
    }
  });
  test(`${locale}: short paths keep all articles and the original stable progress IDs`, () => {
    const available = new Set(published.map((entry) => entry.stepId));
    for (const track of tracks) {
      const core = coreSteps(track);
      assert(core.length > 0);
      assert.equal(new Set(core.map((step) => step.id)).size, core.length);
      for (const chapter of track.chapters) {
        assert.equal(chapter.title.length, 3);
        assert.equal(chapter.goal.length, 3);
        assert(
          chapter.steps.every((id) => available.has(id)),
          chapter.title[1],
        );
      }
      for (const step of track.steps.filter((step) => step.doc)) {
        assert(available.has(step.id), `Missing article ${step.doc}`);
        assert(entries.some((entry) => entry.id === `doc:${step.doc}`));
      }
      assert.equal(
        nextReadingStep(track, core[0].id, available)?.id,
        core[1]?.id,
      );
      assert.equal(nextReadingStep(track, core.at(-1).id, available), null);
    }
  });
}

test("saved plans and missing metadata never invent reading times or save dates", () => {
  const pending = {
    id: "pending",
    title: "待研究",
    en: "Planned",
    titleTw: "待研究",
  };
  const rows = savedLearningEntries(
    [{ domain: "rag", steps: [pending, { id: "legacy" }] }],
    [],
    { saved: ["pending", "legacy"], items: { pending: { status: "reading" } } },
    "en",
  );
  assert.deepEqual(
    rows.map((row) => row.title),
    ["Planned", "legacy"],
  );
  assert.equal(rows[0].href, "/learning#step-pending");
  assert.equal(rows[0].stage, "reading");
  assert(
    rows.every(
      (row) =>
        row.planned && row.minutes === undefined && row.savedAt === undefined,
    ),
  );
  const dated = {
    title: "Dated",
    savedAt: "2026-11-01T00:00:00.000Z",
    minutes: 12,
  };
  for (const order of ["newest", "oldest", "shortest"]) {
    assert.equal(
      [...rows, dated].sort((a, b) => compareReadingEntries(a, b, order))[0],
      dated,
    );
  }
});

test("focused studies use their declared follow-up, not a generic next item", () => {
  const track = {
    chapters: [{ steps: ["a", "c"] }],
    steps: [
      { id: "a", doc: "a" },
      { id: "b", doc: "b", followUps: ["doc:c"] },
      { id: "c", doc: "c" },
      { id: "d", doc: "d" },
    ],
  };
  const available = new Set(["a", "b", "c", "d"]);
  assert.equal(nextReadingStep(track, "b", available)?.id, "c");
  assert.equal(nextReadingStep(track, "d", available), null);
  assert.equal(nextReadingStep(track, "b", new Set(["a", "b"])), null);
});

test("learning filters survive a URL round trip without keeping hidden anchors", () => {
  const filters = { query: "缓存 & JSON", difficulty: "advanced", saved: true };
  const target = learningFilterUrl(
    "https://huhohoo.com/en/learning?utm_source=bookmark#step-hidden",
    filters,
  );
  const url = new URL(target, "https://huhohoo.com");
  assert.deepEqual(readLearningFilters(url.search), filters);
  assert.equal(url.pathname, "/en/learning");
  assert.equal(url.hash, "");
  assert.equal(url.searchParams.get("utm_source"), "bookmark");
  assert.equal(
    learningFilterUrl(url.href, readLearningFilters()),
    "/en/learning?utm_source=bookmark",
  );
  assert.deepEqual(readLearningFilters("?difficulty=unknown&saved=false"), {
    query: "",
    difficulty: "all",
    saved: false,
  });
});

test("filtered paths expose only matching groups and counts, including plan-only results", () => {
  const track = {
    chapters: [{ title: ["主线", "Core"], steps: ["a"] }],
    steps: [
      { id: "a", doc: "a" },
      { id: "b", doc: "b" },
      { id: "c", title: "Plan" },
    ],
  };
  const available = new Set(["a", "b"]);
  for (const id of ["a", "b", "c", "missing"]) {
    const groups = readingGroups(track, available, (step) => step.id === id);
    assert.equal(groups.chapters.length, id === "a" ? 1 : 0);
    assert.equal(groups.studies.length, id === "b" ? 1 : 0);
    assert.equal(groups.plans.length, id === "c" ? 1 : 0);
  }
});
