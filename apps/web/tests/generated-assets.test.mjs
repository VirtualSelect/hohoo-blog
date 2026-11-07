import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pruneGeneratedAssets } from "../scripts/prune-generated-assets.mjs";

function fixture(t) {
  const app = fs.mkdtempSync(path.join(os.tmpdir(), "hohoo-generated-assets-"));
  t.after(() => {
    const resolved = path.resolve(app);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("hohoo-generated-assets-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  for (const dir of ["generated", "public/search", "public/radar-data"])
    fs.mkdirSync(path.join(app, dir), { recursive: true });
  const current = [];
  for (const locale of ["zh-CN", "zh-TW", "en"]) {
    const searchUrl = `/search/${locale}-${"a".repeat(16)}.json`;
    const chunk = `/radar-data/${locale}-${"b".repeat(16)}.json`;
    fs.writeFileSync(
      path.join(app, "generated", `${locale}.json`),
      JSON.stringify({ searchUrl, radarArchive: { chunks: [chunk] } }),
    );
    for (const url of [searchUrl, chunk]) {
      const file = path.join(app, "public", url.slice(1));
      fs.writeFileSync(file, "[1]");
      current.push(file);
    }
  }
  const stale = path.join(app, "public/search", `en-${"c".repeat(16)}.json`);
  fs.writeFileSync(stale, "old");
  return { app, stale, current };
}

test("prunes only unreferenced hash indexes and preserves current/custom assets", (t) => {
  const f = fixture(t);
  const custom = path.join(f.app, "public/search", "manual.json");
  const directory = path.join(
    f.app,
    "public/search",
    `en-${"d".repeat(16)}.json`,
  );
  fs.writeFileSync(custom, "keep");
  fs.mkdirSync(directory);
  assert.deepEqual(pruneGeneratedAssets(f.app), { files: 1, bytes: 3 });
  assert.equal(fs.existsSync(f.stale), false);
  for (const file of f.current)
    assert.equal(fs.readFileSync(file, "utf8"), "[1]");
  assert.equal(fs.readFileSync(custom, "utf8"), "keep");
  assert.ok(fs.statSync(directory).isDirectory());
  assert.deepEqual(pruneGeneratedAssets(f.app), { files: 0, bytes: 0 });
});

test("missing locale manifest aborts before removing any file", (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.app, "generated", "en.json"));
  assert.throws(() => pruneGeneratedAssets(f.app), /ENOENT/);
  assert.ok(fs.existsSync(f.stale));
});

test("invalid references abort without touching stale or current files", (t) => {
  const f = fixture(t);
  fs.writeFileSync(
    path.join(f.app, "generated", "en.json"),
    JSON.stringify({
      searchUrl: "/search/../../outside.json",
      radarArchive: { chunks: [] },
    }),
  );
  assert.throws(
    () => pruneGeneratedAssets(f.app),
    /Invalid generated asset reference/,
  );
  assert.ok(fs.existsSync(f.stale));
  for (const file of f.current) assert.ok(fs.existsSync(file));
});

test("linked asset directories cannot redirect cleanup outside public", (t) => {
  const f = fixture(t);
  const original = path.join(f.app, "public/search");
  const linked = path.join(f.app, "preserved-search");
  fs.renameSync(original, linked);
  fs.symlinkSync(
    linked,
    original,
    process.platform === "win32" ? "junction" : "dir",
  );
  assert.throws(() => pruneGeneratedAssets(f.app), /Refusing to prune/);
  assert.ok(fs.existsSync(path.join(linked, path.basename(f.stale))));
});
