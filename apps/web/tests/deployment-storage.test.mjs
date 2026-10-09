import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  clientGlobalData,
  clientMessages,
  pageGlobalData,
  pageSignals,
} from "../lib/client-content.ts";
import { readingForks } from "../lib/reading-forks.mjs";
import { writingEntries } from "../../../src/utils/localization.cjs";
import { isoWeek } from "../../../src/utils/radar.cjs";
import { canonicalPath, publicPaths } from "../lib/visitor-stats.mjs";
import {
  affectsAstra,
  ignoredBuildExitCode,
} from "../../astra-hero/scripts/ignore-build.mjs";

test("client translations preserve every message and leave authoring notes in source", () => {
  for (const locale of ["zh-CN", "zh-TW", "en"]) {
    const messages = JSON.parse(
      fs.readFileSync(
        new URL(`../../../i18n/${locale}/code.json`, import.meta.url),
      ),
    );
    const before = JSON.stringify(messages);
    const compact = clientMessages(messages);
    assert.deepEqual(Object.keys(compact), Object.keys(messages));
    for (const [key, value] of Object.entries(messages)) {
      assert.equal(compact[key].message, value.message, key);
      assert.equal(compact[key].description, undefined);
    }
    assert.equal(JSON.stringify(messages), before);
  }
  assert.deepEqual(clientMessages({ missing: undefined }), {
    missing: undefined,
  });
});

for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(`${locale}: compact index preserves discovery and each detail route`, () => {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const before = JSON.stringify(data.globalData);
    const compact = clientGlobalData(data.globalData, locale, "");
    assert(
      Buffer.byteLength(JSON.stringify(compact)) <
        Buffer.byteLength(before) * 0.55,
    );
    assert.deepEqual(
      compact["content-index"].entries.map((e) => e.id),
      data.globalData["content-index"].entries.map((e) => e.id),
    );
    assert.deepEqual(
      compact["content-index"].activity.map((e) => e.id),
      data.globalData["content-index"].activity.map((e) => e.id),
    );
    for (const [i, entry] of data.globalData[
      "content-index"
    ].entries.entries()) {
      const summary = compact["content-index"].entries[i];
      for (const key of [
        "id",
        "href",
        "title",
        "description",
        "titleEn",
        "descriptionEn",
        "number",
        "type",
        "articleKind",
        "status",
        "domain",
        "date",
        "updated",
        "minutes",
        "related",
        "prerequisites",
        "translationStatus",
        "stepId",
        "slug",
        "stack",
        "aliases",
      ])
        assert.deepEqual(summary[key], entry[key], `${entry.id}: ${key}`);
      const route = entry.href.replace(/^\/(en|zh-TW)(?=\/)/, "").slice(1);
      const detail = clientGlobalData(data.globalData, locale, route);
      assert.deepEqual(detail["content-index"].entries[i], entry);
    }
    for (const entry of compact["content-index"].activity)
      assert.equal(
        entry,
        compact["content-index"].entries.find((e) => e.id === entry.id),
      );
    assert.equal(
      JSON.stringify(data.globalData),
      before,
      "must not mutate build data",
    );
  });
}
test("visitor allowlist matches the previous content-derived list exactly", () => {
  const data = JSON.parse(
    fs.readFileSync(new URL("../generated/zh-CN.json", import.meta.url)),
  );
  const expected = [
    ...new Set([
      ...data.globalData["content-index"].entries.map((e) =>
        canonicalPath(e.href),
      ),
      ...data.routes.map((r) => canonicalPath("/" + r)),
    ]),
  ].sort();
  const actual = JSON.parse(
    fs.readFileSync(
      new URL("../generated/visitor-paths.json", import.meta.url),
    ),
  );
  assert.deepEqual(actual, expected);
  const rows = actual.flatMap((p) => [
    { requestPath: p, pageviews: 1 },
    { requestPath: "/en" + p, pageviews: 2 },
  ]);
  rows.push({ requestPath: "/private-unlisted", pageviews: 100 });
  assert.deepEqual(
    publicPaths(rows, new Set(actual)),
    publicPaths(rows, new Set(expected)),
  );
});

test("route-scoped data retains all article links, recommendations, progress and search fallbacks", () => {
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    for (const document of data.documents) {
      const original = clientGlobalData(
        data.globalData,
        locale,
        document.route,
      );
      const scoped = pageGlobalData(
        data.globalData,
        locale,
        document.route,
        document,
      );
      if (document.frontMatter.landing) {
        assert.deepEqual(scoped, original);
        continue;
      }
      const entries = scoped["content-index"].entries;
      assert.deepEqual(
        writingEntries(entries).slice(0, 3),
        writingEntries(original["content-index"].entries).slice(0, 3),
      );
      if (["docs", "blog"].includes(document.kind)) {
        const id =
          (document.kind === "blog" ? "blog:" : "doc:") + document.metadata.id;
        assert.deepEqual(
          readingForks(entries, id, document.frontMatter),
          readingForks(
            original["content-index"].entries,
            id,
            document.frontMatter,
          ),
        );
        assert.deepEqual(scoped["learning-index"], original["learning-index"]);
        for (const linked of [
          ...(document.frontMatter.related || []),
          ...(document.frontMatter.prerequisites || []),
        ]) {
          assert.deepEqual(
            entries.find((e) => e.id === linked),
            original["content-index"].entries.find((e) => e.id === linked),
          );
        }
      }
      assert(
        Buffer.byteLength(JSON.stringify(scoped)) <
          Buffer.byteLength(JSON.stringify(original)) * 0.6,
        document.route,
      );
    }
    for (const route of data.routes.filter((r) =>
      /^(news\/daily|radar\/weekly)\//.test(r),
    )) {
      const source = route.startsWith("news/") ? data.dailyItems : data.items;
      const expected = source.filter((item) =>
        route.startsWith("news/")
          ? item.collectedAt.startsWith(route.split("/").pop())
          : isoWeek(item.publishedAt) === route.split("/").pop(),
      );
      assert.deepEqual(pageSignals(source, route), expected, route);
    }
  }
});
test("Astra skips unrelated content but builds shared sources and dependency changes", () => {
  for (const file of [
    "data/news/items.json",
    "src/pages/news/daily/2026-10-06.md",
    "docs/llm/cache.md",
    "apps/web/app/globals.css",
    "reports/audit.md",
  ])
    assert.equal(affectsAstra([file]), false, file);
  for (const file of [
    "apps/astra-hero/app/page.tsx",
    "src/components/AstraParticleHero/shaders/simulation.frag",
    "package-lock.json",
    ".node-version",
    "apps/astra-hero/scripts/ignore-build.mjs",
  ])
    assert.equal(affectsAstra([file]), true, file);
  const env = {
    VERCEL_GIT_PREVIOUS_SHA: "a".repeat(40),
    VERCEL_GIT_COMMIT_SHA: "b".repeat(40),
  };
  assert.equal(
    ignoredBuildExitCode(env, () => "data/news/items.json\0"),
    0,
  );
  assert.equal(
    ignoredBuildExitCode(
      { ...env, ASTRA_FORCE_BUILD: "1" },
      () => "data/news/items.json\0",
    ),
    1,
  );
  assert.equal(
    ignoredBuildExitCode(
      env,
      () => "src/components/AstraParticleHero/scene.ts\0",
    ),
    1,
  );
  assert.equal(
    ignoredBuildExitCode({}, () => {
      throw Error("should not call Git");
    }),
    1,
  );
  assert.equal(
    ignoredBuildExitCode(env, () => {
      throw Error("shallow clone");
    }),
    1,
  );
  assert.equal(
    ignoredBuildExitCode({
      ...env,
      VERCEL_GIT_COMMIT_SHA: env.VERCEL_GIT_PREVIOUS_SHA,
    }),
    1,
  );
});

test("scoped lab/project details retain every detail field and related summary", () => {
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    for (const entry of data.globalData["content-index"].entries.filter((e) =>
      ["lab", "project", "note", "paper"].includes(e.type),
    )) {
      const route = entry.href.replace(/^\/(en|zh-TW)(?=\/)/, "").slice(1);
      const entries = pageGlobalData(data.globalData, locale, route, null)[
        "content-index"
      ].entries;
      assert.deepEqual(
        entries.find((e) => e.id === entry.id),
        entry,
      );
      const full = clientGlobalData(data.globalData, locale, route)[
        "content-index"
      ].entries;
      for (const id of entry.related || [])
        assert.deepEqual(
          entries.find((e) => e.id === id),
          full.find((e) => e.id === id),
        );
      assert.deepEqual(
        writingEntries(entries).slice(0, 3),
        writingEntries(full).slice(0, 3),
      );
    }
  }
});

test("daily archive preserves every pre-clustering collected record", () => {
  const raw = JSON.parse(
    fs.readFileSync(new URL("../../../data/news/items.json", import.meta.url)),
  );
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    assert.deepEqual(
      data.dailyItems.map((i) => i.id),
      raw.map((i) => i.id),
    );
    for (const day of new Set(raw.map((i) => i.collectedAt.slice(0, 10)))) {
      assert.deepEqual(
        pageSignals(data.dailyItems, "news/daily/" + day).map((i) => i.id),
        raw.filter((i) => i.collectedAt.startsWith(day)).map((i) => i.id),
      );
    }
  }
});
