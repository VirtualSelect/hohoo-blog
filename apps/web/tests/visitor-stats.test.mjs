import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalPath,
  publicPaths,
  publicCountries,
  redactVisit,
} from "../lib/visitor-stats.mjs";
test("analytics redacts search and anchors without losing locale", () => {
  assert.equal(
    redactVisit({ url: "https://huhohoo.com/en/articles?q=private#note" }).url,
    "https://huhohoo.com/en/articles",
  );
  assert.equal(redactVisit({ url: "invalid" }), null);
});
test("only public paths are exposed and language pageviews are merged", () => {
  const rows = [
    { requestPath: "/en/blog/test", pageviews: 3 },
    { requestPath: "/zh-TW/blog/test/", pageviews: 2 },
    { requestPath: "/secret", pageviews: 4 },
  ];
  assert.deepEqual(publicPaths(rows, new Set(["/blog/test"])), {
    "/blog/test": 5,
  });
  assert.equal(canonicalPath("//evil.test"), null);
  assert.equal(canonicalPath("/en"), "/");
  assert.throws(() =>
    publicPaths(
      [{ requestPath: "/blog/test", pageviews: -1 }],
      new Set(["/blog/test"]),
    ),
  );
  assert.throws(() => publicPaths(undefined, new Set()));
});
test("country aggregates suppress small groups and strip other fields", () => {
  assert.deepEqual(
    publicCountries([
      { country: "CN", visitors: 3, city: "private" },
      { country: "US", visitors: 2 },
      { country: "Others", visitors: 100 },
    ]),
    [{ country: "CN", visitors: 3 }],
  );
});
