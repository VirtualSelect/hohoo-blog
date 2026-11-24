import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { evaluateReviewedHoldout } from "../../../scripts/research/section-search-holdout.mjs";
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

test("the offline comparison reproduces the recorded trade-off on the frozen corpus", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../scripts/compare-section-search.mjs", import.meta.url),
      ),
    ],
    { encoding: "utf8", timeout: 10000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    JSON.parse(result.stdout),
    read("../../../reports/section-search-comparison-v2.json"),
  );
});

const trialPassage = {
  id: "trial:camera",
  documentId: "trial",
  href: "/trial#camera",
  title: "Viewport settings",
  heading: "Camera width",
  text: "Camera width is measured in pixels.",
  contentHash: hash("Camera width is measured in pixels."),
};
const trialHoldout = {
  topK: 5,
  questions: [
    { id: "answerable", query: "camera width" },
    { id: "miss", query: "horizontal resolution unit" },
    { id: "boundary", query: "camera width range" },
    { id: "empty", query: "satellite cost" },
  ],
};
const trialHash = hash(JSON.stringify(trialHoldout));
const trialReview = {
  holdoutHash: trialHash,
  reviewedAt: "2024-02-29",
  questions: [
    {
      id: "miss",
      evidence: [{ id: trialPassage.id, quote: "measured in pixels" }],
    },
    {
      id: "answerable",
      evidence: [{ id: trialPassage.id, quote: "measured in pixels" }],
    },
    {
      id: "boundary",
      evidence: [],
      missing: "No supported range is recorded.",
    },
    {
      id: "empty",
      evidence: [],
      missing: "No satellite costs are recorded.",
    },
  ],
};
const evaluateTrial = (review, corpus = [trialPassage]) =>
  evaluateReviewedHoldout({
    holdout: trialHoldout,
    holdoutHash: trialHash,
    corpus,
    review,
  });

test("reviewed holdout counts retrieval and leaves the first-candidate boundary verdict for human review", () => {
  const { summary, rows } = evaluateTrial(trialReview);
  assert.deepEqual(summary, {
    answerableHitAtK: { hits: 1, total: 2 },
    unanswerableWithCandidates: { withCandidates: 1, total: 2 },
    unanswerableFirstCandidateExplainsBoundary: {
      count: null,
      total: 1,
      status: "awaiting-review",
    },
  });
  assert.deepEqual(
    rows.map(({ id, firstRelevantRank, candidates }) => [
      id,
      firstRelevantRank,
      candidates.length,
    ]),
    [
      ["answerable", 1, 1],
      ["miss", null, 0],
      ["boundary", null, 1],
      ["empty", null, 0],
    ],
  );
  assert.deepEqual(rows[2].candidates[0], {
    id: trialPassage.id,
    href: trialPassage.href,
    heading: trialPassage.heading,
    text: trialPassage.text,
    contentHash: trialPassage.contentHash,
  });
  const noBoundaryCandidate = evaluateTrial(trialReview, [
    {
      ...trialPassage,
      heading: "Measurement unit",
      text: "Width is measured in pixels.",
      contentHash: hash("Width is measured in pixels."),
    },
  ]);
  assert.deepEqual(
    noBoundaryCandidate.summary.unanswerableFirstCandidateExplainsBoundary,
    { count: null, total: 0, status: "not-applicable" },
  );
});

test("holdout rejects invalid or partial review data before creating the searcher", () => {
  const unreadableHeading = [
    {
      ...trialPassage,
      get heading() {
        throw new Error("search index should not be created");
      },
    },
  ];
  const cases = [
    [(review) => (review.holdoutHash = "stale"), /指纹/],
    [(review) => (review.reviewedAt = "2025-02-29"), /日期/],
    [(review) => review.questions.pop(), /覆盖/],
    [(review) => (review.questions[3].id = review.questions[2].id), /重复/],
    [(review) => (review.questions[3].id = "unknown-question"), /缺少复核证据/],
    [
      (review) => (review.questions[0].evidence[0].id = "unknown-passage"),
      /引文/,
    ],
    [
      (review) => (review.questions[0].evidence[0].quote = "no such quote"),
      /引文/,
    ],
    [
      (review) =>
        review.questions[0].evidence.push(review.questions[0].evidence[0]),
      /重复的证据/,
    ],
    [(review) => (review.questions[1].missing = ""), /不应填写/],
    [(review) => (review.questions[3].missing = "  "), /必须填写/],
  ];
  for (const [change, message] of cases) {
    const review = structuredClone(trialReview);
    change(review);
    assert.throws(() => evaluateTrial(review, unreadableHeading), message);
  }
});
