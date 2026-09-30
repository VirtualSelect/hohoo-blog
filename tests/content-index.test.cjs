const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const matter = require("../apps/web/node_modules/gray-matter");
const {
  collectContent,
  validate,
  activity,
} = require("../lib/content/content-index.cjs");
// The registry contains real project/Lab relations. Load real document metadata
// so adding an article does not require maintaining a second list of fake docs.
function repositoryDocs(prefix) {
  const root = path.resolve(__dirname, "../docs");
  return fs
    .readdirSync(root, { recursive: true })
    .map((file) => file.replaceAll("\\", "/"))
    .filter(
      (file) =>
        /\.(md|mdx)$/.test(file) &&
        (file.includes("/") || file === "intro.md") &&
        !file.startsWith("templates/"),
    )
    .map((file) => {
      const frontMatter = matter(
        fs.readFileSync(path.join(root, file), "utf8"),
      ).data;
      const id = frontMatter.id || file.replace(/\.(md|mdx)$/, "");
      return {
        id,
        title: frontMatter.title,
        frontMatter,
        permalink:
          prefix + "/docs/" + String(frontMatter.slug || id).replace(/^\//, ""),
      };
    });
}
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
      docs: [
        { id: "planned", frontMatter: { status: "planning" } },
        ...repositoryDocs("/en"),
      ],
    },
    "/en",
  );
  const blog = result.find((e) => e.type === "blog");
  assert.equal(blog.date, "2024-07-11");
  assert.equal(blog.href, "/en/blog/real");
  assert.ok(!result.some((e) => e.id === "doc:planned"));
  assert.equal(
    result.find((e) => e.id === "doc:ai-apps/radar-publishing-pipeline")
      .articleKind,
    "case-study",
  );
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
  assert.throws(
    () => validate([{ ...base, articleKind: "invented-kind" }]),
    /Invalid article kind/,
  );
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
