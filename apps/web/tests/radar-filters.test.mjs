import test from "node:test";
import assert from "node:assert/strict";
import {
  readRadarFilters,
  filterRadarItems,
  radarFilterUrl,
} from "../lib/radar-filters.mjs";

test("shared radar filters validate unknown options and preserve unicode queries", () => {
  assert.deepEqual(
    readRadarFilters(
      "?q=具身+智能&domain=embodied&source=paper",
      ["embodied"],
      ["paper"],
    ),
    { query: "具身 智能", domain: "embodied", source: "paper" },
  );
  assert.deepEqual(
    readRadarFilters("?domain=unknown&source=unknown", ["embodied"], ["paper"]),
    { query: "", domain: "all", source: "all" },
  );
});
test("radar search combines words, source and domain without altering the original order", () => {
  const items = [
    {
      id: "a",
      title: "Robot control",
      summary: "Policy evaluation",
      domain: "embodied",
      sourceId: "paper",
      sourceName: "arXiv",
    },
    {
      id: "b",
      title: "Robot control",
      summary: "Policy evaluation",
      domain: "embodied",
      sourceId: "news",
    },
  ];
  assert.deepEqual(
    filterRadarItems(items, {
      query: "ARXIV evaluation",
      domain: "embodied",
      source: "paper",
    }).map((i) => i.id),
    ["a"],
  );
  assert.equal(
    filterRadarItems(items, { query: "unknown", domain: "all", source: "all" })
      .length,
    0,
  );
  assert.deepEqual(
    filterRadarItems(items, { query: "   ", domain: "all", source: "all" }),
    items,
  );
});
test("radar URL updates preserve locale and unrelated parameters and clear stale anchors", () => {
  assert.equal(
    radarFilterUrl("https://huhohoo.com/radar", {
      query: "all",
      domain: "all",
      source: "all",
    }),
    "/radar?q=all",
  );
  assert.equal(
    radarFilterUrl(
      "https://huhohoo.com/zh-TW/radar?ref=reading&q=old#signal-old",
      { query: "Java", domain: "all", source: "paper" },
    ),
    "/zh-TW/radar?ref=reading&q=Java&source=paper",
  );
  assert.equal(
    radarFilterUrl("https://huhohoo.com/radar?q=Java&source=paper", {
      query: "",
      domain: "all",
      source: "all",
    }),
    "/radar",
  );
});
