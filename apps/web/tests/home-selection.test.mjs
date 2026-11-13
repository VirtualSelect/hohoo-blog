import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { selectedHomeArticle } from "../lib/home-selection.mjs";

const expectedArticles = {
  "ai-apps": "ai-apps/java-recovery-reconciliation",
  llm: "llm/kv-cache",
  "embodied-ai": "embodied-ai/mujoco-controller-holdout",
  rag: "ai-apps/java-retrieval-evidence",
};

for (const locale of ["zh-CN", "en", "zh-TW"])
  test(`${locale}: every home direction selects the existing localized article`, () => {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const entries = data.globalData["content-index"].entries;
    const prefix = locale === "zh-CN" ? "" : `/${locale}`;
    for (const [domain, slug] of Object.entries(expectedArticles)) {
      const article = selectedHomeArticle(entries, domain);
      assert.ok(article, `${locale}: missing ${domain} selection`);
      assert.equal(article.id, `doc:${slug}`);
      assert.equal(article.href, `${prefix}/docs/${slug}`);
      assert.equal(article.locale, locale);
      assert.equal(article.status, "published");
      assert.notEqual(article.translationStatus, "MISSING");
      assert.equal(
        article,
        entries.find((entry) => entry.id === article.id),
      );
      assert.ok(data.routes.includes(`docs/${slug}`));
    }
  });

test("home selections exclude unpublished, missing-translation and non-writing records", () => {
  const published = {
    id: "doc:llm/kv-cache",
    href: "/en/docs/llm/kv-cache",
    title: "Existing article",
    type: "doc",
    status: "published",
    translationStatus: "AI_TRANSLATED",
  };
  assert.equal(selectedHomeArticle([published], "llm"), published);
  for (const status of [
    "planning",
    "learning",
    "building",
    "experiment",
    "archived",
  ])
    assert.equal(
      selectedHomeArticle([{ ...published, status }], "llm"),
      undefined,
    );
  assert.equal(
    selectedHomeArticle(
      [{ ...published, translationStatus: "MISSING" }],
      "llm",
    ),
    undefined,
  );
  assert.equal(
    selectedHomeArticle([{ ...published, type: "project" }], "llm"),
    undefined,
  );
});

test("unknown directions and absent articles keep the home selection empty", () => {
  const entries = [
    {
      id: "doc:llm/kv-cache",
      href: "/docs/llm/kv-cache",
      type: "doc",
      status: "published",
    },
  ];
  for (const domain of [
    undefined,
    null,
    "",
    "all",
    "unknown",
    "__proto__",
    "toString",
  ])
    assert.equal(selectedHomeArticle(entries, domain), undefined);
  assert.equal(selectedHomeArticle(entries, "rag"), undefined);
  for (const domain of Object.keys(expectedArticles))
    assert.equal(selectedHomeArticle([], domain), undefined);
});
