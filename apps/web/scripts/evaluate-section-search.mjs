import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createSectionSearcher } from "../lib/section-search.mjs";
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const hash = (text) => createHash("sha256").update(text).digest("hex");
const fixture = path.join(app, "tests/fixtures/section-search-protocol.json");
const lock = path.join(app, "tests/fixtures/section-search-snapshot.json");
const corpusFile = path.join(
  app,
  "tests/fixtures/section-search-corpus-v1.json",
);
const protocol = read(fixture);
const data = read(path.join(app, "generated", protocol.locale + ".json"));
const all = read(path.join(app, "public", data.sectionSearchUrl));
const algorithmHash = hash(
  fs
    .readFileSync(path.join(app, "lib/section-search.mjs"), "utf8")
    .replace(/\r\n/g, "\n"),
);
const protocolHash = hash(JSON.stringify(protocol));
const freezing = process.argv.includes("--freeze");
const live = process.argv.includes("--live");
if (freezing && live)
  throw new Error("Choose freezing or live evaluation, not both.");
if (freezing && (fs.existsSync(lock) || fs.existsSync(corpusFile)))
  throw new Error(
    "Snapshot already exists. Preserve v1; make an explicitly versioned new protocol for a new study.",
  );
if (!freezing && !fs.existsSync(lock))
  throw new Error("Missing frozen snapshot.");
const previous = freezing ? null : read(lock);
const corpus =
  previous && !live
    ? read(corpusFile)
    : all.filter(
        (passage) => !protocol.excludedDocumentIds.includes(passage.documentId),
      );
const snapshot = {
  version: 1,
  protocolHash,
  algorithmHash,
  corpusHash: hash(JSON.stringify(corpus)),
  passages: corpus.length,
  documentIds: [...new Set(corpus.map((passage) => passage.documentId))].sort(),
};
if (freezing) {
  fs.writeFileSync(lock, JSON.stringify(snapshot, null, 2) + "\n");
  fs.writeFileSync(corpusFile, JSON.stringify(corpus, null, 2) + "\n");
} else if (!live && JSON.stringify(snapshot) !== JSON.stringify(previous))
  throw new Error(
    "Frozen protocol, algorithm or corpus changed. Do not silently reuse this result; retain the original revision or create a new version.",
  );
const search = createSectionSearcher(corpus);
const rows = protocol.questions.map((question) => {
  for (const evidence of question.expected) {
    if (
      !corpus.some(
        (passage) =>
          passage.href === evidence.href &&
          passage.text.includes(evidence.quote),
      )
    )
      throw new Error("Missing labeled evidence: " + question.id);
  }
  const results = search(question.query, protocol.topK);
  const rank = results.findIndex((result) =>
    question.expected.some(
      (evidence) =>
        result.href === evidence.href && result.text.includes(evidence.quote),
    ),
  );
  return {
    id: question.id,
    query: question.query,
    answerable: question.expected.length > 0,
    expected: question.expected,
    firstRelevantRank: rank < 0 ? null : rank + 1,
    retrieved: results.map((result) => ({
      id: result.id,
      href: result.href,
      heading: result.heading,
      text: result.text,
      contentHash: result.contentHash,
    })),
  };
});
const positive = rows.filter((row) => row.answerable);
const negative = rows.filter((row) => !row.answerable);
const result = {
  version: 1,
  ...(live
    ? { corpusMode: "current-working-tree-not-a-new-frozen-benchmark" }
    : {}),
  classification: "development-acceptance-not-independent-benchmark",
  labels: protocol.labels,
  snapshot,
  topK: protocol.topK,
  summary: {
    answerable: positive.length,
    hitAtK: positive.filter((row) => row.firstRelevantRank !== null).length,
    noAnswer: negative.length,
    noAnswerWithCandidates: negative.filter((row) => row.retrieved.length > 0)
      .length,
  },
  rows,
};
const output = path.resolve(
  app,
  live
    ? "../../reports/section-search-evaluation-current.json"
    : "../../reports/section-search-evaluation-v1.json",
);
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      report: output,
      ...result.summary,
      corpusPassages: snapshot.passages,
      corpusDocuments: snapshot.documentIds.length,
    },
    null,
    2,
  ),
);
