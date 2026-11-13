import test from "node:test";
import assert from "node:assert/strict";
import tracks from "../../../data/learning-paths.json" with { type: "json" };
import {
  defaultReadingFilters,
  readingFilterOptions,
  readReadingFilters,
  readingFilterUrl,
} from "../lib/reading-list.mjs";
import { languageUrl } from "../lib/navigation.ts";

const topics = tracks.map((track) => track.domain);

test("reading filters preserve the existing default view and validate every URL field", () => {
  assert.deepEqual(readReadingFilters("", topics), {
    status: "inbox",
    type: "all",
    topic: "all",
    sort: "newest",
  });
  assert.deepEqual(
    readReadingFilters(
      "?status=all&type=learning&topic=llm&sort=oldest",
      topics,
    ),
    { status: "all", type: "learning", topic: "llm", sort: "oldest" },
  );
  assert.deepEqual(
    readReadingFilters(
      "?status=unknown&type=__proto__&topic=unpublished&sort=constructor",
      topics,
    ),
    defaultReadingFilters,
  );
  assert.deepEqual(
    readReadingFilters("?status=&type=&topic=&sort=", topics),
    defaultReadingFilters,
  );
  assert.equal(readReadingFilters("?topic=llm").topic, "all");
});

test("all supported reading views survive URL round trips without persisting bookmarks", () => {
  for (const status of readingFilterOptions.status)
    for (const type of readingFilterOptions.type)
      for (const topic of ["all", ...topics])
        for (const sort of readingFilterOptions.sort) {
          const expected = { status, type, topic, sort };
          const path = readingFilterUrl(
            "https://huhohoo.com/reading?ref=desk#main-content",
            expected,
            topics,
          );
          const url = new URL(path, "https://huhohoo.com");
          assert.deepEqual(readReadingFilters(url.search, topics), expected);
          assert.equal(url.searchParams.get("ref"), "desk");
          assert.equal(url.hash, "#main-content");
          assert.deepEqual(
            [...url.searchParams.keys()].filter((key) => key !== "ref").sort(),
            Object.keys(expected)
              .filter((key) => expected[key] !== defaultReadingFilters[key])
              .sort(),
          );
        }
});

test("reset removes only owned filters and normalization cannot copy extra state into the URL", () => {
  const href =
    "https://huhohoo.com/en/reading?status=done&status=reading&type=paper&topic=rag&sort=shortest&ref=desk&ref=share#main-content";
  assert.equal(
    readingFilterUrl(href, defaultReadingFilters, topics),
    "/en/reading?ref=desk&ref=share#main-content",
  );
  assert.equal(
    readingFilterUrl(
      "https://huhohoo.com/reading",
      {
        ...defaultReadingFilters,
        saved: ["private-bookmark"],
        note: "private",
      },
      topics,
    ),
    "/reading",
  );
  assert.equal(
    readingFilterUrl(
      "https://huhohoo.com/reading?status=done",
      { ...defaultReadingFilters, topic: "unknown" },
      topics,
    ),
    "/reading",
  );
});

test("language switching preserves reading filters and uses the existing language navigation", () => {
  const filters = {
    status: "all",
    type: "learning",
    topic: "rag",
    sort: "oldest",
  };
  const view = readingFilterUrl(
    "https://huhohoo.com/reading?ref=desk",
    filters,
    topics,
  );
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const localized = languageUrl(
      locale,
      "reading",
      "https://huhohoo.com" + view,
    );
    const url = new URL(localized, "https://huhohoo.com");
    assert.equal(
      url.pathname,
      (locale === "zh-CN" ? "" : "/" + locale) + "/reading",
    );
    assert.deepEqual(readReadingFilters(url.search, topics), filters);
    assert.equal(url.searchParams.get("ref"), "desk");
  }
});
