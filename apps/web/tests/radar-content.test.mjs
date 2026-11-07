import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { radarContentAsset } from "../lib/radar-content.mjs";
const { projectSignal } = createRequire(import.meta.url)(
  "../../../src/utils/radar-locale.cjs",
);

test("RSS text has one hashed asset and never expands locale discovery payloads", () => {
  const item = {
    id: "a".repeat(20),
    sourceId: "aihot",
    title: "Fixture",
    summary: "Short",
    feedContent: {
      format: "aihot-rss-text-v1",
      language: "zh-CN",
      capturedAt: "2026-11-07T00:00:00Z",
      paragraphs: ["Long text <script> is displayed as text, never HTML."],
    },
  };
  const asset = radarContentAsset(item);
  assert.match(asset.url, /^\/radar-content\/[a-f0-9]{20}-[a-f0-9]{16}\.json$/);
  assert.equal(JSON.parse(asset.json).paragraphs.length, 1);
  assert.equal(
    radarContentAsset({ ...item, title: "A translated title" }).url,
    asset.url,
  );
  assert.notEqual(
    radarContentAsset({
      ...item,
      feedContent: { ...item.feedContent, paragraphs: ["Changed"] },
    }).url,
    asset.url,
  );
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const projected = projectSignal(
      { ...item, feedContentUrl: asset.url, coverage: [item] },
      locale,
    );
    assert.equal(projected.feedContentUrl, asset.url);
    assert.ok(!JSON.stringify(projected).includes("Long text"));
  }
  assert.throws(() => radarContentAsset({ ...item, id: "../escape" }));
  assert.throws(() => radarContentAsset({ ...item, sourceId: "unknown" }));
});
