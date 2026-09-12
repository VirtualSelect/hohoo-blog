const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  collectContent,
  validate,
  activity,
} = require("../lib/content/content-index.cjs");
test("index keeps native blog dates and URLs, and excludes planning docs", () => {
  const result = collectContent(
    {
      blogPosts: [
        {
          metadata: {
            title: "Real",
            description: "Real text",
            permalink: "/en/blog/real",
            date: new Date("2024-07-11"),
            frontMatter: { slug: "real" },
          },
        },
      ],
      docs: [{ id: "planned", frontMatter: { status: "planning" } }],
    },
    "/en",
  );
  const blog = result.find((e) => e.type === "blog");
  assert.equal(blog.date, "2024-07-11");
  assert.equal(blog.href, "/en/blog/real");
  assert.ok(!result.some((e) => e.id === "doc:planned"));
});
test("activity excludes proposals, source signals and undated paper guides", () => {
  assert.deepEqual(
    activity([
      { id: "a", type: "lab", status: "planning", date: "2026-09-11" },
      { id: "b", type: "radar-item", status: "published", date: "2026-09-11" },
      { id: "c", type: "paper", status: "to-read" },
      { id: "d", type: "project", status: "production", date: "2026-09-10" },
    ]).map((e) => e.id),
    ["d"],
  );
});
test("registry rejects broken relations, bad dates and invented completed labs", () => {
  const base = {
    id: "project:a",
    title: "A",
    href: "/projects/a",
    status: "production",
  };
  assert.throws(() => validate([base, base]), /Duplicate/);
  assert.throws(() => validate([{ ...base, related: ["missing"] }]), /Unknown/);
  assert.throws(
    () => validate([{ ...base, date: "2026-02-30" }]),
    /Invalid date/,
  );
  assert.throws(
    () => validate([{ ...base, type: "lab", status: "completed" }]),
    /evidence/,
  );
});
