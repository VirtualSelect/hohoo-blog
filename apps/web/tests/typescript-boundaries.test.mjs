import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { locales, isLocale } from "../lib/site-types.ts";
import { writingKinds } from "../../../src/utils/writing-kinds.ts";

test("locale guard rejects unsupported persisted or URL values", () => {
  for (const locale of locales) assert.equal(isLocale(locale), true);
  for (const value of [null, undefined, 1, "zh", "fr", {}, "__proto__"])
    assert.equal(isLocale(value), false);
});

// JSON is validated by the existing content pipeline before loading into the
// typed application. Check the application-facing contract against real output.
for (const locale of locales) {
  test(`${locale}: generated content matches the typed reading boundary`, () => {
    const data = JSON.parse(
      fs.readFileSync(
        new URL(`../generated/${locale}.json`, import.meta.url),
        "utf8",
      ),
    );
    assert.equal(data.locale, locale);
    assert(data.routes.every((route) => typeof route === "string"));
    for (const entry of data.globalData["content-index"].entries) {
      for (const key of [
        "id",
        "title",
        "description",
        "href",
        "type",
        "status",
      ])
        assert.equal(typeof entry[key], "string", `${entry.id}.${key}`);
      assert(isLocale(entry.locale));
      assert(isLocale(entry.sourceLocale));
      if (entry.domain)
        assert(["ai-apps", "llm", "embodied-ai", "rag"].includes(entry.domain));
      if (entry.articleKind)
        assert(Object.hasOwn(writingKinds, entry.articleKind));
      if (entry.minutes !== undefined)
        assert.equal(typeof entry.minutes, "number");
    }
    for (const doc of data.documents) {
      assert(["docs", "blog", "news/daily"].includes(doc.kind));
      assert.equal(typeof doc.html, "string");
      assert.equal(typeof doc.sourceFallback, "boolean");
      assert.equal(typeof doc.metadata.title, "string");
      assert.equal(typeof doc.metadata.description, "string");
      assert.equal(typeof doc.metadata.permalink, "string");
      for (const heading of doc.headings) {
        assert([2, 3].includes(heading.depth));
        assert.equal(typeof heading.id, "string");
        assert.equal(typeof heading.text, "string");
      }
    }
    const messages = JSON.parse(
      fs.readFileSync(
        new URL(`../../../i18n/${locale}/code.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const value of Object.values(messages))
      assert.equal(typeof value.message, "string");
  });
}
