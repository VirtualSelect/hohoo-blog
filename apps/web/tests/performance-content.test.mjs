import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
for (const locale of ["zh-CN", "en", "zh-TW"])
  test(`archive chunks retain every ${locale} signal in order`, () => {
    const data = read(`../generated/${locale}.json`);
    const chunks = data.radarArchive.chunks.map((url) =>
      read("../public" + url),
    );
    assert.ok(chunks.every((c) => c.length <= 24));
    assert.deepEqual(
      [...data.items.slice(0, 12), ...chunks.flat()].map((i) => i.id),
      data.items.map((i) => i.id),
    );
    assert.equal(data.radarArchive.total, data.items.length);
    assert.deepEqual(read("../public" + data.searchUrl), data.search);
  });
