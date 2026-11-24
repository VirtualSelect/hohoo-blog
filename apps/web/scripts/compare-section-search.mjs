import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createSectionSearcher, searchTerms } from "../lib/section-search.mjs";

const fixtures = new URL("../tests/fixtures/", import.meta.url);
const read = (filename) =>
  JSON.parse(readFileSync(new URL(filename, fixtures), "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");

const protocol = read("section-search-comparison-v2.json");
const archive = read("section-search-snapshot.json");
const corpus = read("section-search-corpus-v1.json");
const corpusHash = hash(JSON.stringify(corpus));
const algorithmHash = hash(
  readFileSync(
    new URL("../lib/section-search.mjs", import.meta.url),
    "utf8",
  ).replace(/\r\n/g, "\n"),
);
assert.equal(corpusHash, archive.corpusHash, "Archived corpus has changed.");
assert.equal(
  algorithmHash,
  archive.algorithmHash,
  "Archived baseline has changed.",
);

const search = createSectionSearcher(corpus);
const summarizeResults = (candidates, expected) => {
  const first = candidates.findIndex((passage) =>
    expected.some(
      ({ href, quote }) =>
        passage.href === href && passage.text.includes(quote),
    ),
  );
  return {
    firstRelevantRank: first === -1 ? null : first + 1,
    retrieved: candidates.map(({ id, href, heading, contentHash }) => ({
      id,
      href,
      heading,
      contentHash,
    })),
  };
};

const rows = protocol.questions.map((question) => {
  for (const { href, quote } of question.expected) {
    assert(
      corpus.some(
        (passage) => passage.href === href && passage.text.includes(quote),
      ),
      "Labeled evidence missing from the archived corpus: " + question.id,
    );
  }
  const terms = [...new Set(searchTerms(question.query))];
  assert(terms.length, "Question has no searchable terms: " + question.id);
  const candidates = search(question.query, Infinity);
  const covered = candidates.filter(({ heading, text }) => {
    const passageTerms = new Set(searchTerms(heading + " " + text));
    const matching = terms.filter((term) => passageTerms.has(term)).length;
    return matching / terms.length >= protocol.minimumBodyTermCoverage;
  });
  return {
    ...question,
    baseline: summarizeResults(
      candidates.slice(0, protocol.topK),
      question.expected,
    ),
    bodyCoverage: summarizeResults(
      covered.slice(0, protocol.topK),
      question.expected,
    ),
  };
});

const positive = rows.filter(({ expected }) => expected.length > 0);
const negative = rows.filter(({ expected }) => expected.length === 0);
const summarize = (variant) => ({
  hitAtK: positive.filter((row) => row[variant].firstRelevantRank !== null)
    .length,
  misses: positive
    .filter((row) => row[variant].firstRelevantRank === null)
    .map(({ id }) => id),
  noAnswerWithCandidates: negative
    .filter((row) => row[variant].retrieved.length > 0)
    .map(({ id }) => id),
});

console.log(
  JSON.stringify(
    {
      version: protocol.version,
      locale: protocol.locale,
      classification: "offline-comparison-author-review-pending",
      labels: protocol.labels,
      protocolHash: hash(JSON.stringify(protocol)),
      corpusHash,
      algorithmHash,
      passages: corpus.length,
      topK: protocol.topK,
      variants: {
        baseline: "Archived lexical ranking and existing per-document cap.",
        bodyCoverage:
          "Same ranked candidates and per-document cap, then filter by distinct query terms present in heading or body before taking top K.",
        minimumBodyTermCoverage: protocol.minimumBodyTermCoverage,
      },
      summary: {
        answerable: positive.length,
        noAnswer: negative.length,
        baseline: summarize("baseline"),
        bodyCoverage: summarize("bodyCoverage"),
      },
      rows,
    },
    null,
    2,
  ),
);
