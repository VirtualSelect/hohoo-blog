import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildChangelog,
  readChangelogFilters,
  changelogFilterUrl,
  filterChangelog,
  changelogMonths,
} from "../lib/changelog-data.ts";

const load = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const articleHistory = load("../../../data/article-history.json");
const codeRecords = load("../../../data/build-log.json");
const locales = ["zh-CN", "en", "zh-TW"];
const snapshots = Object.fromEntries(
  locales.map((locale) => [locale, load(`../generated/${locale}.json`)]),
);
const entriesFor = (locale) =>
  snapshots[locale].globalData["content-index"].entries;
const revisionCommit = "d0e650ef1198fe39743badd671f6a308dbc1b49f";
const publicationCommit = "35a395153c3645cdc1f9e1e4e4e82e0961e213af";
const revisedRoutes = [
  "docs/ai-apps/java-first-llm",
  "docs/ai-apps/java-durable-turns",
  "docs/embodied-ai/mujoco-stale-force",
];
const defaults = { category: "all", month: "all", q: "" };
const fixture = {
  id: "doc:fixture",
  type: "doc",
  status: "published",
  title: "A durable conversation",
  description: "Request ownership and recovery boundaries.",
  href: "/docs/fixture",
  locale: "zh-CN",
  sourceLocale: "zh-CN",
  date: "2026-09-12",
  translationStatus: "ORIGINAL",
};
const siteRecord = {
  project: "project:hohoo-blog",
  commit: "a".repeat(40),
  date: "2026-11-13",
  committedAt: "2026-11-13T16:02:14+08:00",
  title: "feat: preserve research navigation",
  headline: ["保留研究导航", "Preserve research navigation", "保留研究導覽"],
  summary: ["恢复阅读位置。", "Restore reading position.", "恢復閱讀位置。"],
  modules: ["learning", "reading", "learning"],
};

for (const locale of locales) {
  test(`${locale}: current content keeps stable IDs, localized routes and one original publication`, () => {
    const entries = entriesFor(locale);
    const records = buildChangelog({
      entries,
      codeRecords,
      articleHistory,
      locale,
    });
    const otherLocale = locale === "en" ? "zh-CN" : "en";
    const eligibleIds = new Set(
      records
        .filter((record) => record.contentId)
        .map((record) => record.contentId),
    );
    const mixed = buildChangelog({
      entries: [
        ...entriesFor(otherLocale).filter((entry) => eligibleIds.has(entry.id)),
        ...entries,
        ...entries,
      ],
      codeRecords,
      articleHistory,
      locale,
    });
    assert.equal(
      new Set(records.map((record) => record.id)).size,
      records.length,
    );
    assert.deepEqual(
      mixed.map((record) => record.id),
      records.map((record) => record.id),
    );
    for (const record of mixed.filter((item) => item.contentId)) {
      const entry = entries.find((item) => item.id === record.contentId);
      assert.ok(entry, record.contentId);
      assert.equal(record.href, entry.href);
      assert.equal(record.title, entry.title);
      const route = record.href.replace(/^\/(?:en|zh-TW)(?=\/)/, "").slice(1);
      assert.ok(snapshots[locale].routes.includes(route), record.href);
    }
    const first = records.filter(
      (record) => record.contentId === "doc:ai-apps/java-first-llm",
    );
    const publication = first.filter((record) => record.kind === "publication");
    assert.equal(publication.length, 1);
    assert.equal(
      publication[0].id,
      "content:doc:ai-apps/java-first-llm:publication",
    );
    assert.equal(publication[0].date, "2026-09-12");
    assert.equal(publication[0].dateSource, "publication");
    assert.deepEqual(publication[0].commits, [publicationCommit]);
    assert.equal(
      first.filter(
        (record) =>
          record.kind === "revision" && record.commits.includes(revisionCommit),
      ).length,
      1,
    );
  });

  test(`${locale}: three verified revisions use actual history dates and translated summaries`, () => {
    const records = buildChangelog({
      entries: entriesFor(locale),
      codeRecords: [],
      articleHistory,
      locale,
    });
    const revisions = records.filter(
      (record) =>
        record.kind === "revision" && record.commits.includes(revisionCommit),
    );
    assert.equal(revisions.length, revisedRoutes.length);
    for (const route of revisedRoutes) {
      assert.ok(snapshots[locale].routes.includes(route));
      const evidence = articleHistory[route].find(
        (item) => item.kind === "revision" && item.commit === revisionCommit,
      );
      assert.ok(evidence, route);
      assert.equal(evidence.date, "2026-11-13");
      assert.equal(evidence.summary.length, 3);
      const id = `doc:${route.slice("docs/".length)}`;
      const record = revisions.find((item) => item.contentId === id);
      assert.ok(record, id);
      assert.equal(record.category, "content");
      assert.equal(record.date, evidence.date);
      assert.equal(record.dateSource, "revision");
      assert.deepEqual(record.commits, [revisionCommit]);
      assert.equal(record.summary, evidence.summary[locales.indexOf(locale)]);
      assert.equal(record.preview, false);
    }
  });
}

test("updated metadata alone never creates a revision or changes the original date", () => {
  const entries = [{ ...fixture, updated: "2026-11-13" }];
  const records = buildChangelog({ entries, codeRecords: [] });
  assert.equal(records.length, 1);
  assert.equal(records[0].kind, "publication");
  assert.equal(records[0].date, fixture.date);
  assert.deepEqual(records[0].commits, []);
});

test("duplicate code, content and history deduplicate by event, preserving distinct articles in one commit", () => {
  const second = { ...fixture, id: "doc:second", href: "/docs/second" };
  const publication = {
    kind: "publication",
    date: fixture.date,
    commit: "b".repeat(40),
    summary: ["首次发表", "First publication", "首次發表"],
  };
  const revision = {
    kind: "revision",
    date: siteRecord.date,
    commit: siteRecord.commit,
    summary: [
      "澄清取消边界",
      "Clarify cancellation boundaries",
      "釐清取消邊界",
    ],
  };
  const history = {
    "docs/fixture": [publication, publication, revision, revision],
    "docs/second": [publication, revision],
  };
  const records = buildChangelog({
    entries: [fixture, fixture, second, second],
    codeRecords: [siteRecord, siteRecord],
    articleHistory: history,
  });
  assert.equal(records.length, 5);
  assert.equal(records.filter((record) => record.kind === "site").length, 1);
  assert.equal(
    records.filter((record) => record.kind === "publication").length,
    2,
  );
  assert.equal(
    records.filter((record) => record.kind === "revision").length,
    2,
  );
  assert.equal(
    new Set(records.map((record) => record.id)).size,
    records.length,
  );
  assert.deepEqual(records.find((record) => record.kind === "site").modules, [
    "learning",
    "reading",
  ]);
  for (const record of records.filter((record) => record.contentId))
    assert.equal(record.commits.length, 1);
});

test("missing translations, unpublished or hidden content and external Radar records stay out", () => {
  const excluded = [
    { ...fixture, translationStatus: "MISSING" },
    { ...fixture, status: "draft" },
    { ...fixture, status: "planning" },
    { ...fixture, draft: true },
    { ...fixture, unlisted: true },
    { ...fixture, type: "radar-item" },
    { ...fixture, type: "radar-digest" },
    { ...fixture, type: "project", status: "production" },
    { ...fixture, type: "lab", status: "completed" },
    { ...fixture, href: "//example.com/fixture" },
    { ...fixture, href: "https://example.com/fixture" },
    { ...fixture, date: "2026-02-30" },
    { ...fixture, date: "2026-13-01" },
    { ...fixture, date: undefined },
  ];
  for (const entry of excluded)
    assert.deepEqual(
      buildChangelog({ entries: [entry], codeRecords: [], articleHistory }),
      [],
      JSON.stringify(entry),
    );
});

test("branch code records are hidden by default and explicitly labeled when included", () => {
  const branch = { ...siteRecord, scope: "branch", branch: "codex/example" };
  assert.deepEqual(buildChangelog({ entries: [], codeRecords: [branch] }), []);
  const records = buildChangelog({
    entries: [],
    codeRecords: [branch],
    includePreview: true,
    locale: "en",
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].category, "site");
  assert.equal(records[0].preview, true);
  assert.equal(records[0].branch, "codex/example");
  assert.equal(records[0].timestamp, siteRecord.committedAt);
  assert.equal(records[0].title, "Preserve research navigation");
  assert.deepEqual(
    buildChangelog({
      entries: [],
      codeRecords: [{ ...branch, branch: undefined }],
      includePreview: true,
    }),
    [],
  );
});

test("maintained November branch checkpoints keep exact commit times without becoming releases", () => {
  const expected = [
    ["84722880383d5f51b88895a044c1d6124eb9d400", "2026-11-13T16:02:14+08:00"],
    ["745834814213e0fa0cae9637485e02d5f0d623ae", "2026-11-13T16:22:12+08:00"],
    ["ad168370c37ee49568d1847ccc222ea77fb472d1", "2026-11-13T17:13:07+08:00"],
  ];
  const publicRecords = buildChangelog({ entries: [], codeRecords });
  const previewRecords = buildChangelog({
    entries: [],
    codeRecords,
    includePreview: true,
  });
  for (const [commit, timestamp] of expected) {
    assert.ok(!publicRecords.some((record) => record.commits.includes(commit)));
    const record = previewRecords.find((item) => item.commits.includes(commit));
    assert.ok(record, commit);
    assert.equal(record.preview, true);
    assert.equal(record.branch, "codex/ai-lab-reimagined-20261112");
    assert.equal(record.date, "2026-11-13");
    assert.equal(record.dateSource, "commit");
    assert.equal(record.timestamp, timestamp);
  }
  assert.ok(!previewRecords.some((record) => record.category === "release"));
});

test("code and content dates do not imply deployment, and malformed evidence is ignored", () => {
  const records = buildChangelog({
    entries: [fixture],
    codeRecords: [
      { ...siteRecord, title: "release: published a version" },
      { ...siteRecord, commit: "invalid" },
      { ...siteRecord, date: "2026-02-30" },
      { ...siteRecord, project: "project:another-repository" },
    ],
    articleHistory: {
      "docs/fixture": [
        {
          kind: "revision",
          date: "2026-09-11",
          commit: "c".repeat(40),
          summary: "earlier",
        },
        {
          kind: "revision",
          date: "2026-02-30",
          commit: "c".repeat(40),
          summary: "invalid",
        },
        {
          kind: "revision",
          date: "2026-11-13",
          commit: "short",
          summary: "unattributed",
        },
        {
          kind: "revision",
          date: "2026-11-13",
          commit: "c".repeat(40),
          summary: " ",
        },
      ],
    },
  });
  assert.equal(records.length, 2);
  assert.deepEqual(
    new Set(records.map((record) => record.category)),
    new Set(["site", "content"]),
  );
  assert.deepEqual(
    filterChangelog(records, { ...defaults, category: "release" }),
    [],
  );
  assert.equal(
    records.find((record) => record.kind === "site").dateSource,
    "commit",
  );
  const mismatch = buildChangelog({
    entries: [],
    codeRecords: [{ ...siteRecord, committedAt: "2026-11-14T01:00:00+08:00" }],
  });
  assert.equal(mismatch[0].timestamp, undefined);
});

test("months and category/search conditions operate on actual event dates", () => {
  const records = buildChangelog({
    entries: [fixture],
    codeRecords: [siteRecord],
    articleHistory: {
      "docs/fixture": [
        {
          kind: "revision",
          date: "2026-10-01",
          commit: "c".repeat(40),
          summary: "Clarified response ownership.",
        },
      ],
    },
  });
  assert.deepEqual(changelogMonths([...records, ...records]), [
    "2026-11",
    "2026-10",
    "2026-09",
  ]);
  assert.deepEqual(changelogMonths([]), []);
  const revision = filterChangelog(records, {
    category: "content",
    month: "2026-10",
    q: "ownership",
  });
  assert.equal(revision.length, 1);
  assert.equal(revision[0].kind, "revision");
  assert.equal(
    filterChangelog(records, { ...defaults, q: "PRESERVE navigation" }).length,
    1,
  );
  assert.equal(
    filterChangelog(records, { ...defaults, q: "not-present-at-all" }).length,
    0,
  );
});

test("invalid filter values fall back while valid months and decoded search survive", () => {
  assert.deepEqual(
    readChangelogFilters("?category=unknown&month=2026-13&q=cancel%20state"),
    {
      ...defaults,
      q: "cancel state",
    },
  );
  assert.deepEqual(
    readChangelogFilters(
      "?category=content&month=2026-10&q=%E4%BF%AE%E8%AE%A2",
      ["2026-10"],
    ),
    {
      category: "content",
      month: "2026-10",
      q: "修订",
    },
  );
  assert.deepEqual(
    readChangelogFilters("?category=site&month=2026-10", ["2026-11"]),
    {
      ...defaults,
      category: "site",
    },
  );
  assert.equal(readChangelogFilters("?category=release").category, "release");
  assert.deepEqual(readChangelogFilters(""), defaults);
});

test("filter URLs preserve language, unrelated parameters and hash, and omit only their defaults", () => {
  const current =
    "https://huhohoo.com/en/changelog?ref=shared&tag=one&tag=two&q=old#record-durable";
  const updated = changelogFilterUrl(current, {
    category: "content",
    month: "2026-11",
    q: "取消 恢复",
  });
  const parsed = new URL(updated, "https://huhohoo.com");
  assert.equal(parsed.pathname, "/en/changelog");
  assert.equal(parsed.hash, "#record-durable");
  assert.equal(parsed.searchParams.get("ref"), "shared");
  assert.deepEqual(parsed.searchParams.getAll("tag"), ["one", "two"]);
  assert.deepEqual(readChangelogFilters(parsed.search, ["2026-11"]), {
    category: "content",
    month: "2026-11",
    q: "取消 恢复",
  });
  const reset = new URL(
    changelogFilterUrl(parsed.href, { ...defaults, q: "  " }),
    "https://huhohoo.com",
  );
  assert.equal(reset.pathname, parsed.pathname);
  assert.equal(reset.hash, parsed.hash);
  assert.equal(reset.searchParams.get("ref"), "shared");
  assert.deepEqual(reset.searchParams.getAll("tag"), ["one", "two"]);
  for (const key of ["category", "month", "q"])
    assert.equal(reset.searchParams.has(key), false);
  const word = new URL(
    changelogFilterUrl(current, { ...defaults, q: "all" }),
    "https://huhohoo.com",
  );
  assert.equal(word.searchParams.get("q"), "all");
});
