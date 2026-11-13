import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createSectionSearcher, searchTerms } from "../lib/section-search.mjs";
const read = (name) =>
  JSON.parse(fs.readFileSync(new URL(name, import.meta.url), "utf8"));
const hash = (text) => createHash("sha256").update(text).digest("hex");
test("frozen acceptance results are reproduced without using the explanatory article as evidence", () => {
  const protocol = read("./fixtures/section-search-protocol.json");
  const snapshot = read("./fixtures/section-search-snapshot.json");
  const report = read("../../../reports/section-search-evaluation-v1.json");
  // Article edits must not replace the corpus that produced a historical score.
  const corpus = read("./fixtures/section-search-corpus-v1.json");
  assert.equal(hash(JSON.stringify(corpus)), snapshot.corpusHash);
  assert.deepEqual(
    [...new Set(corpus.map((passage) => passage.documentId))].sort(),
    snapshot.documentIds,
  );
  assert.equal(hash(JSON.stringify(protocol)), snapshot.protocolHash);
  assert.equal(
    hash(
      fs
        .readFileSync(
          new URL("../lib/section-search.mjs", import.meta.url),
          "utf8",
        )
        .replace(/\r\n/g, "\n"),
    ),
    snapshot.algorithmHash,
  );
  assert(!snapshot.documentIds.includes("doc:rag/blog-passage-search"));
  const search = createSectionSearcher(corpus);
  for (const [i, question] of protocol.questions.entries()) {
    const actual = search(question.query, protocol.topK);
    assert.equal(report.rows[i].id, question.id);
    assert.deepEqual(
      actual.map((p) => p.id),
      report.rows[i].retrieved.map((p) => p.id),
    );
    for (const expected of question.expected)
      assert(
        corpus.some(
          (p) => p.href === expected.href && p.text.includes(expected.quote),
        ),
      );
    for (const passage of actual)
      assert.equal(hash(passage.text), passage.contentHash);
  }
  const failed = report.rows.find((row) => row.id === "absent-guarantee");
  assert.equal(failed.answerable, false);
  assert(
    failed.retrieved.length > 0,
    "Preserve the known lexical false positive instead of claiming perfect abstention.",
  );
  assert.equal(
    report.classification,
    "development-acceptance-not-independent-benchmark",
  );
});

test("the three article versions carry a runnable diagnostic that preserves frozen evidence", () => {
  const paths = [
    "../../../docs/rag/blog-passage-search.md",
    "../../../i18n/en/docs/rag/blog-passage-search.md",
    "../../../i18n/zh-TW/docs/rag/blog-passage-search.md",
  ];
  const scripts = paths.map((path) => {
    const article = fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const script =
      /```powershell\r?\n@'\r?\n([\s\S]*?)\r?\n'@ \| node --input-type=module\r?\n```/.exec(
        article,
      )?.[1];
    assert.ok(script, path);
    return script.replace(/\r\n/g, "\n");
  });
  assert.equal(scripts[0], scripts[1]);
  assert.equal(scripts[0], scripts[2]);
  const protectedFiles = [
    "./fixtures/section-search-protocol.json",
    "./fixtures/section-search-snapshot.json",
    "./fixtures/section-search-corpus-v1.json",
    "../lib/section-search.mjs",
    "../../../reports/section-search-evaluation-v1.json",
  ];
  const fingerprints = () =>
    protectedFiles.map((path) =>
      hash(fs.readFileSync(new URL(path, import.meta.url))),
    );
  const before = fingerprints();
  const result = spawnSync(process.execPath, ["--input-type=module"], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)),
    input: scripts[0],
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  const protocol = read("./fixtures/section-search-protocol.json");
  const archived = read(
    "../../../reports/section-search-evaluation-v1.json",
  ).rows.find((row) => row.id === "absent-guarantee");
  assert.equal(
    output.query,
    protocol.questions.find((q) => q.id === "absent-guarantee").query,
  );
  assert.deepEqual(output.queryTerms, ["缓存", "保证", "证成", "成功"]);
  assert.deepEqual(
    output.firstTwo.map((row) => row.id),
    archived.retrieved.slice(0, 2).map((row) => row.id),
  );
  assert.deepEqual(
    output.firstTwo.map((row) => row.matched),
    [
      ["证成", "成功"],
      ["缓存", "保证"],
    ],
  );
  assert.deepEqual(
    output.firstTwo.map((row) => row.missing),
    [
      ["缓存", "保证"],
      ["证成", "成功"],
    ],
  );
  assert.deepEqual(fingerprints(), before);
});

test("the explicitly constructed negation example disproves full token overlap as support", () => {
  const query = searchTerms("缓存 保证成功");
  const negated = new Set(searchTerms("缓存不能保证成功。"));
  assert.ok(query.every((term) => negated.has(term)));
  const snapshot = read("./fixtures/section-search-snapshot.json");
  assert.ok(!snapshot.documentIds.includes("doc:rag/blog-passage-search"));
});
