import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
test("paper sources, reading IDs and experiment links remain consistent", () => {
  const papers = read("../data/papers.json"),
    projects = read("../data/experiments.json"),
    redirects = read("../data/content-redirects.json"),
    tracks = read("../data/learning-paths.json");
  assert.equal(new Set(papers.map((p) => p.id)).size, papers.length);
  assert.equal(new Set(papers.map((p) => p.slug)).size, papers.length);
  for (const p of papers) {
    assert.equal(new URL(p.url).origin, "https://arxiv.org");
    assert.ok(p.url.includes(p.id.slice(6)));
    const project = projects.find((item) => item.id === p.project);
    if (project) {
      assert.equal(project.paper, p.slug);
    } else {
      // Retired plans resolve through the maintained migration map instead of
      // requiring a placeholder experiment to be restored to the catalogue.
      const target = redirects["/labs/" + p.project];
      assert.ok(target, `${p.id}: missing experiment or retirement redirect`);
      const url = new URL(target, "https://huhohoo.com");
      assert.equal(url.origin, "https://huhohoo.com");
      assert.equal(url.pathname, "/learning");
      const track = tracks.find(
        (item) => item.domain === url.searchParams.get("track"),
      );
      assert.ok(track, `${p.id}: missing replacement learning track`);
      assert.ok(p.categories.includes(track.domain));
      assert.equal(url.hash, "#plans-" + track.domain);
      assert.ok(track.steps.some((step) => !step.doc));
    }
    // Abstract-based guides require reading context, not an evidence claim.
    // The content cleanup removed evidence summaries without verified details.
    for (const language of ["zh", "en"])
      for (const key of ["question", "method", "boundary", "prompt"])
        assert.ok(
          p[language]?.[key]?.trim(),
          `${p.id}: ${language}.${key} must contain reading-guide text`,
        );
  }
  for (const project of projects.filter((p) => p.paper))
    assert.ok(papers.some((p) => p.slug === project.paper));
});
