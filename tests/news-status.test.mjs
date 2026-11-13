import test from "node:test";
import assert from "node:assert/strict";
import {
  radarSnapshot,
  isRadarSnapshot,
} from "../apps/web/lib/radar-snapshot.mjs";
import {
  inspectNews,
  formatNewsStatus,
  siteOrigin,
} from "../scripts/news/status-lib.mjs";

const config = {
  dailyLimit: 10,
  sources: [
    {
      id: "aihot",
      enabled: true,
      aggregator: true,
      feed: "https://example.com/feed?private=do-not-publish",
    },
  ],
};
const item = (id, extra = {}) => ({
  id,
  sourceId: "aihot",
  title: "RAG retrieval " + id,
  summary: "A technical source excerpt.",
  url: "https://example.com/" + id,
  publishedAt: "2026-11-11T00:00:00Z",
  collectedAt: "2026-11-11T09:48:49Z",
  ...extra,
});
const records = [
  item("one"),
  item("two", { url: "https://example.com/one?utm_source=feed" }),
];
const sha = "a".repeat(40);
const rss =
  '<?xml version="1.0"?><rss version="2.0"><channel><title>Radar</title><link>https://example.com</link><description>External signals</description><item><title>one</title><link>https://example.com/one</link><pubDate>Wed, 11 Nov 2026 00:00:00 GMT</pubDate></item></channel></rss>';

function fixture({
  siteSnapshot = radarSnapshot(records, config),
  rssBody = rss,
  networkError = false,
} = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (networkError) throw Error("Network unavailable");
    const body = url.endsWith("/commits/main")
      ? { sha }
      : url.endsWith("/data/news/items.json")
        ? records
        : url.endsWith("/config/news-sources.json")
          ? config
          : url.endsWith("/radar/snapshot.json")
            ? siteSnapshot
            : url.endsWith("/news/rss.xml")
              ? rssBody
              : {
                  workflow_runs: [
                    {
                      id: 123,
                      path: ".github/workflows/ai-news.yml",
                      status: "completed",
                      conclusion: "success",
                      run_started_at: "2026-11-11T18:00:00Z",
                      updated_at: "2026-11-11T18:01:00Z",
                      head_sha: sha,
                    },
                  ],
                };
    return new Response(
      typeof body === "string" ? body : JSON.stringify(body),
      { status: body === null ? 404 : 200 },
    );
  };
  return { calls, fetcher };
}

test("snapshot separates stored records from existing event clustering and exposes no feed URL", () => {
  const snapshot = radarSnapshot(records, config);
  assert.equal(snapshot.recordCount, 2);
  assert.equal(snapshot.signalCount, 1);
  assert.equal(snapshot.latestCollectedAt, "2026-11-11T09:48:49.000Z");
  assert.ok(isRadarSnapshot(snapshot));
  assert.ok(!JSON.stringify(snapshot).includes("do-not-publish"));
  assert.deepEqual(snapshot.enabledSources, ["aihot"]);
  assert.deepEqual(
    radarSnapshot(records, {
      ...config,
      sources: [...config.sources, { id: "not-enabled" }],
    }).enabledSources,
    ["aihot"],
  );
});

test("data fingerprint ignores object keys and top-level record order, changes on an actual edit", () => {
  const reordered = [...records]
    .reverse()
    .map((r) => Object.fromEntries(Object.entries(r).reverse()));
  assert.equal(
    radarSnapshot(records, config).dataHash,
    radarSnapshot(reordered, config).dataHash,
  );
  assert.notEqual(
    radarSnapshot(records, config).dataHash,
    radarSnapshot(
      [item("one", { summary: "Corrected excerpt" }), records[1]],
      config,
    ).dataHash,
  );
  assert.equal(
    radarSnapshot(records, { ...config, dailyLimit: 8 }).dataHash,
    radarSnapshot(records, config).dataHash,
  );
});

test("invalid data fails clearly, while a genuinely empty archive retains null dates", () => {
  assert.throws(
    () => radarSnapshot([records[0], records[0]], config),
    /duplicate/,
  );
  assert.throws(
    () => radarSnapshot([item("bad", { collectedAt: "invalid" })], config),
    /collectedAt/,
  );
  assert.throws(
    () => radarSnapshot(records, { ...config, dailyLimit: 0 }),
    /limit/,
  );
  const empty = radarSnapshot([], config);
  assert.equal(empty.latestCollectedAt, null);
  assert.ok(isRadarSnapshot(empty));
  assert.equal(isRadarSnapshot({ ...empty, dataHash: "not-a-hash" }), false);
  assert.equal(isRadarSnapshot({ ...empty, recordCount: 2 }), false);
  assert.equal(
    isRadarSnapshot({
      ...radarSnapshot(records, config),
      latestCollectedAt: 0,
    }),
    false,
  );
});

test("same archive across main/site and zero-new successful run does not become a collection failure", async () => {
  const { calls, fetcher } = fixture();
  const report = await inspectNews({ records, config, fetcher });
  assert.deepEqual(report.comparisons, {
    localToMain: "same",
    mainToSite: "same",
    siteToRss: "same-summary",
  });
  assert.equal(report.workflow.value.conclusion, "success");
  assert.equal(
    report.siteSnapshot.value.latestCollectedAt,
    "2026-11-11T09:48:49.000Z",
  );
  assert.match(formatNewsStatus(report), /零新增可能是去重或筛选/);
  assert.ok(
    calls.some((call) =>
      call.url.includes(`/` + sha + `/data/news/items.json`),
    ),
  );
  assert.ok(
    calls.every(
      (call) => !call.options.method && !call.options.headers.Authorization,
    ),
  );
});

test("older local checkout is distinguished from a healthy remote and deployed dataset", async () => {
  const { fetcher } = fixture();
  const report = await inspectNews({ records: [], config, fetcher });
  assert.equal(report.comparisons.localToMain, "different");
  assert.equal(report.comparisons.mainToSite, "same");
});

test("older release without a snapshot falls back to RSS without claiming exact identity", async () => {
  const { fetcher } = fixture({ siteSnapshot: null });
  const report = await inspectNews({ records, config, fetcher });
  assert.equal(report.siteSnapshot.status, "unavailable");
  assert.equal(report.rss.value.signalCount, 1);
  assert.equal(report.comparisons.mainToSite, "unknown");
  assert.match(formatNewsStatus(report), /无法核实（HTTP 404）/);
});

test("network failure, malformed snapshot and invalid RSS stay unknown rather than empty or healthy", async () => {
  const disconnected = await inspectNews({
    records,
    config,
    fetcher: fixture({ networkError: true }).fetcher,
  });
  assert.equal(disconnected.rss.status, "unavailable");
  assert.equal(disconnected.comparisons.mainToSite, "unknown");
  const malformed = await inspectNews({
    records,
    config,
    fetcher: fixture({ siteSnapshot: {}, rssBody: "not RSS" }).fetcher,
  });
  assert.equal(malformed.siteSnapshot.reason, "Invalid news snapshot");
  assert.equal(malformed.rss.status, "unavailable");
});

test("a different RSS summary is visible, and preview labels never call loopback production", async () => {
  const report = await inspectNews({
    records,
    config,
    site: "http://localhost:4216",
    fetcher: fixture({ rssBody: rss.replace("11 Nov", "10 Nov") }).fetcher,
  });
  assert.equal(report.site, "http://localhost:4216");
  assert.equal(report.comparisons.siteToRss, "different-summary");
  assert.match(formatNewsStatus(report), /条数或最新日期不同/);
  assert.match(formatNewsStatus(report), /localhost:4216/);
});

test("origin input rejects credentials, arbitrary paths and non-loopback plaintext", () => {
  for (const value of [
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/redirect",
    "https://example.com/?token=secret",
  ])
    assert.throws(() => siteOrigin(value));
  assert.equal(siteOrigin("http://127.0.0.1:4216"), "http://127.0.0.1:4216");
});
