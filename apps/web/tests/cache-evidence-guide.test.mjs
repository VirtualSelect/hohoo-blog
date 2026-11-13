import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { questionEvidence } from "../lib/question-evidence.mjs";
const root = new URL("../../../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");

test("cache synthesis retains the smaller-array/slower-run counterexample and pinned evidence", () => {
  const { cacheTradeoffs: study, cache } = questionEvidence(read);
  assert(study.arrays.block < study.arrays.full);
  assert(study.timing.block > study.timing.full);
  assert.equal(study.shape.tokens, study.timing.tokens);
  assert(study.shape.blockTokens < study.shape.tokens);
  assert(
    cache.find((row) => row.mode === "frozen").total >
      cache.find((row) => row.mode === "full").total,
  );
  assert.match(study.source.code, /\/tree\/[a-f0-9]{40}\//);
  assert.match(study.source.evidence, /\/tree\/[a-f0-9]{40}\/.*evidence/);
});
test("guide numbers are derived from article tables and missing evidence cannot silently become zero", () => {
  const changed = questionEvidence((file) =>
    read(file).replace("131,072 B", "262,144 B"),
  );
  assert.equal(changed.cacheTradeoffs.arrays.full, 262144);
  for (const edit of [
    (text) => text.replace("| 数组 |", "| removed |"),
    (text) => text.replace("131,072 B", "unknown B"),
    (text) => text.replace("N=512、D=32、4个Query", "unrecorded shape"),
  ])
    assert.throws(() => questionEvidence((file) => edit(read(file))));
});
for (const locale of ["zh-CN", "en", "zh-TW"])
  test(
    locale + ": synthesis routes and supporting articles remain available",
    () => {
      const data = JSON.parse(read("apps/web/generated/" + locale + ".json"));
      const tracks = JSON.parse(read("data/learning-paths.json"));
      const llm = tracks.find((track) => track.domain === "llm");
      assert.equal(llm.synthesisHref, "/docs/llm#cache-guide");
      assert(data.routes.includes(llm.synthesisHref.split("#")[0].slice(1)));
      for (const slug of [
        "kv-cache-equivalence",
        "prefix-cache-invalidation",
        "kv-packed-groups",
        "kv-block-decode-cost",
        "prefix-cache-admission",
        "cache-cost-profile",
      ]) {
        const entry = data.globalData["content-index"].entries.find(
          (entry) => entry.id === "doc:llm/" + slug,
        );
        assert(
          entry && entry.translationStatus !== "MISSING",
          locale + ":" + slug,
        );
        assert(data.routes.includes("docs/llm/" + slug));
      }
    },
  );
