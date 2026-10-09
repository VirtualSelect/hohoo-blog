import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Parser from "rss-parser";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const tracks = require("../../../data/learning-paths.json");
const reproduction = require("../../../data/reproduction.json");
const { publicationFacts } = require("../../../src/utils/radar-provenance.cjs");
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

for (const locale of ["zh-CN", "en", "zh-TW"]) {
  test(`${locale}: published writing has a complete, resolvable reading path`, () => {
    const data = JSON.parse(read(`../generated/${locale}.json`));
    const content = data.globalData["content-index"].entries;
    const docs = content.filter(
      (e) => e.type === "doc" && e.status === "published",
    );
    const learning = data.globalData["learning-index"].entries;
    const steps = tracks.flatMap((t) => t.steps).filter((s) => s.doc);
    assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
    assert.deepEqual(
      new Set(steps.map((s) => "doc:" + s.doc)),
      new Set(docs.map((e) => e.id)),
    );
    assert.equal(learning.length, docs.length);
    for (const track of tracks) {
      assert.ok(
        docs.some(
          (e) =>
            e.id ===
            `doc:${track.synthesisDoc || `${track.domain}/${track.synthesis}`}`,
        ),
      );
      for (const step of track.steps.filter((s) => s.doc)) {
        const entry = learning.find((e) => e.stepId === step.id);
        const doc = data.documents.find((d) => d.route === "docs/" + step.doc);
        assert.ok(entry && doc, step.id);
        assert.ok(step.outcome && step.outcomeEn && step.outcomeTw, step.id);
        assert.equal(entry.title, doc.metadata.title);
        assert.equal(
          data.search.find((e) => e.id === "doc:" + step.doc).articleKind,
          content.find((e) => e.id === "doc:" + step.doc).articleKind,
        );
        for (const id of [...entry.prerequisites, ...(step.followUps || [])]) {
          assert.ok(
            content.some((e) => e.id === id),
            `${step.id}: ${id}`,
          );
          assert.notEqual(id, "doc:" + step.doc);
        }
      }
    }
    const visiting = new Set(),
      visited = new Set();
    function walk(id) {
      assert.ok(!visiting.has(id), `Prerequisite cycle at ${id}`);
      if (visited.has(id)) return;
      visiting.add(id);
      const doc = docs.find((e) => e.id === id);
      for (const prerequisite of doc?.prerequisites || []) walk(prerequisite);
      visiting.delete(id);
      visited.add(id);
    }
    docs.forEach((d) => walk(d.id));
    if (locale === "en") {
      for (const digest of content.filter((e) => e.type === "radar-digest"))
        assert.doesNotMatch(digest.description, /[\u3400-\u9fff]/);
    }
  });

  test(`${locale}: RSS keeps all eligible entries and exposes source-date provenance`, async () => {
    const data = JSON.parse(read(`../generated/${locale}.json`));
    const prefix = locale === "zh-CN" ? "" : locale + "/";
    const parser = new Parser();
    const writing = await parser.parseString(
      read(`../public/${prefix}blog/rss.xml`),
    );
    const expected = data.globalData["content-index"].entries.filter(
      (e) =>
        ["doc", "blog"].includes(e.type) &&
        e.status === "published" &&
        e.translationStatus !== "MISSING",
    );
    assert.deepEqual(
      new Set(writing.items.map((e) => e.guid)),
      new Set(expected.map((e) => e.id)),
    );
    const dates = writing.items.map((e) => Date.parse(e.pubDate));
    assert.ok(
      dates.every((d, i) => Number.isFinite(d) && (!i || d <= dates[i - 1])),
    );
    const xml = read(`../public/${prefix}news/rss.xml`);
    assert.equal(xml, read(`../public/${prefix}radar/rss.xml`));
    const radar = await parser.parseString(xml);
    assert.deepEqual(
      new Set(radar.items.map((e) => e.guid)),
      new Set(data.items.map((e) => e.id)),
    );
    const vicuna = radar.items.find((e) => e.guid === "8818e4a8c36c91dacbb0");
    assert.match(vicuna.content, /2023-03-30/);
    assert.match(vicuna.content, /2026-10-03T15:50:46/);
    assert.match(vicuna.content, /2026-10-03T16:40:49/);
    assert.match(vicuna.content, /lmsys\.org/);
  });
}

test("unknown original dates are never inferred from aggregator or collection timestamps", () => {
  const item = {
    sourceId: "aihot",
    publishedAt: "2026-10-03T15:50:46.000Z",
    collectedAt: "2026-10-03T16:40:49.266Z",
  };
  const facts = publicationFacts(item, "en");
  assert.equal(facts[0].value, "Date unverified");
  assert.equal(facts[1].label, "Aggregator publication");
  assert.equal(facts[2].label, "Collected here");
  const original = {
    date: "2023-03-30",
    sourceUrl: "https://www.lmsys.org/blog/2023-03-30-vicuna/",
  };
  assert.deepEqual(
    publicationFacts({ ...item, originalPublication: original }, "en")[0],
    {
      label: "Original announcement",
      value: original.date,
      href: original.sourceUrl,
    },
  );
});

test("every MuJoCo article uses its own existing pinned reproduction entry", () => {
  const data = JSON.parse(read("../generated/zh-CN.json"));
  const docs = data.documents.filter((d) =>
    /^docs\/embodied-ai\/mujoco-/.test(d.route),
  );
  assert.equal(Object.keys(reproduction).length, docs.length);
  for (const doc of docs) {
    const record = reproduction[doc.route.slice(5)];
    assert.ok(record, doc.route);
    assert.match(record.commit, /^[a-f0-9]{40}$/);
    assert.ok(doc.html.includes(`/tree/${record.commit}/${record.directory}`));
    assert.ok(record.run.startsWith(record.directory + "/"));
    assert.ok(record.audit.startsWith(record.directory + "/"));
  }
});
