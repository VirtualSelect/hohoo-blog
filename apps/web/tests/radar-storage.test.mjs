import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  clientGlobalData,
  clientMessages,
  pageGlobalData,
  pageSignals,
} from "../lib/client-content.ts";
import { writingEntries } from "../../../src/utils/localization.cjs";
import { isoWeek } from "../../../src/utils/radar.cjs";
import { localizedNews } from "../../../src/utils/news-locale.mjs";

const read = (file) =>
  JSON.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));

test("route dictionaries preserve active translations and search labels without unrelated journey or retired theme text", () => {
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const original = read(`../../../i18n/${locale}/code.json`);
    const before = JSON.stringify(original);
    const all = clientMessages(original);
    for (const route of [
      "radar",
      "radar/weekly/2026-W44",
      "news/daily/2026-11-07",
      "docs/llm/attention",
    ]) {
      const messages = clientMessages(original, route);
      assert.deepEqual(
        messages["journey.roadmapLabel"],
        all["journey.roadmapLabel"],
      );
      for (const key of Object.keys(original).filter(
        (k) => !k.startsWith("journey.") && !k.startsWith("theme."),
      ))
        assert.deepEqual(messages[key], all[key], key);
      assert.equal(messages["journey.virtual.title"], undefined);
      assert.ok(
        Buffer.byteLength(JSON.stringify(messages)) <
          Buffer.byteLength(JSON.stringify(all)) * 0.5,
      );
    }
    for (const route of ["journey", "journey/virtual-lab"])
      for (const key of Object.keys(original).filter((k) =>
        k.startsWith("journey."),
      ))
        assert.deepEqual(clientMessages(original, route)[key], all[key]);
    assert.equal(JSON.stringify(original), before);
  }
});

test("radar and weekly context keeps search suggestions and linked research, not unrelated catalogues", () => {
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = read(`../generated/${locale}.json`);
    for (const route of [
      "radar",
      "radar/weekly",
      "radar/weekly/2026-W44",
      ...data.globalData["content-index"].entries
        .filter((e) => e.type === "radar-digest")
        .map((e) => e.href.replace(/^\/(en|zh-TW)(?=\/)/, "").slice(1)),
    ]) {
      const full = clientGlobalData(data.globalData, locale, route);
      const linked = full["content-index"].entries.at(-1);
      const scoped = pageGlobalData(data.globalData, locale, route, null, [
        { id: "fixture", related: [linked.id] },
      ]);
      assert.deepEqual(
        writingEntries(scoped["content-index"].entries).slice(0, 3),
        writingEntries(full["content-index"].entries).slice(0, 3),
      );
      assert.deepEqual(
        scoped["content-index"].entries.find((e) => e.id === linked.id),
        linked,
      );
      assert.deepEqual(scoped["learning-index"].entries, []);
      const current = full["content-index"].entries.find(
        (e) =>
          e.href === (locale === "zh-CN" ? "" : "/" + locale) + "/" + route,
      );
      if (current)
        assert.deepEqual(
          pageGlobalData(data.globalData, locale, route, null)[
            "content-index"
          ].entries.find((e) => e.id === current.id),
          current,
        );
      assert.deepEqual(scoped["radar-pages"].preview, []);
      assert.ok(
        JSON.stringify(scoped).length < JSON.stringify(full).length * 0.2,
      );
    }
    assert.deepEqual(
      [...data.radarArchive.weeks].sort(),
      [...new Set(data.items.map((i) => isoWeek(i.publishedAt)))].sort(),
    );
  }
});

test("reading keeps all pre-cluster IDs and locale text while topics keep the same three records", () => {
  const raw = read("../../../data/news/items.json");
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = read(`../generated/${locale}.json`);
    const reading = pageSignals(data.dailyItems, "reading");
    assert.deepEqual(
      reading.map((i) => i.id),
      raw.map((i) => i.id),
    );
    for (const [index, item] of reading.entries()) {
      assert.deepEqual(
        localizedNews(item, locale),
        localizedNews(raw[index], locale),
      );
      assert.equal(item.feedContent, undefined);
      assert.equal(item.coverage, undefined);
      assert.equal(item.searchText, undefined);
    }
    for (const category of ["ai-apps", "llm", "embodied-ai"]) {
      const expected = raw
        .filter((i) => i.category === category)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 3);
      const actual = pageSignals(data.dailyItems, "docs/" + category);
      assert.deepEqual(
        actual.map((i) => i.id),
        expected.map((i) => i.id),
      );
      for (const [index, item] of actual.entries())
        assert.deepEqual(
          localizedNews(item, locale),
          localizedNews(expected[index], locale),
        );
    }
  }
});

test("browser modules cannot import the raw archive containing full RSS text", () => {
  const roots = [
    "../components/",
    "../runtime/",
    "../../../src/components/",
    "../../../src/pages/",
  ];
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = new URL(entry.name, directory);
      if (entry.isDirectory()) inspect(new URL(entry.name + "/", directory));
      else if (/\.[jt]sx?$/.test(entry.name))
        assert.ok(
          !/\b(?:from\s*|require\(\s*)["'][^"']*\/data\/news\/items\.json["']/.test(
            fs.readFileSync(file, "utf8"),
          ),
          file.href,
        );
    }
  }
  for (const root of roots) inspect(new URL(root, import.meta.url));
});
