import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  createEvidenceBundle,
  validateAnswerCitations,
} from "../lib/answer-citations.mjs";

const text = "5s 与 5000 不自动视为相同。读取超时不证明服务器未执行。";
const source = {
  id: "doc:example:1",
  title: "引用边界",
  heading: "原文",
  href: "/docs/example#limits",
  text,
  contentHash: createHash("sha256").update(text).digest("hex"),
};
const index = "/search/zh-CN-0123456789abcdef.json";
const bundle = createEvidenceBundle(index, [source], [source.id]);
const candidate = (quote = text, sourceId = source.id) => ({
  decision: "answer",
  answer: "读取超时不证明服务器未执行。",
  evidence: [{ source_id: sourceId, quote }],
});

test("valid provenance is separate from semantic support", () => {
  const result = validateAnswerCitations(candidate(), bundle);
  assert.equal(result.status, "valid_provenance");
  assert.equal(result.semanticSupport, "unverified");
  assert.equal(
    validateAnswerCitations(
      { ...candidate(), answer: "超时表示服务器一定没有执行。" },
      bundle,
    ).semanticSupport,
    "unverified",
  );
});

test("corrupted verbatim quotes and invented source paths are rejected", () => {
  for (const [value, code] of [
    [candidate("5b不自动视为相同"), "QUOTE_NOT_EXACT"],
    [candidate(text, "doc:java-apps/example:1"), "UNKNOWN_SOURCE"],
    [candidate("   "), "EMPTY_QUOTE"],
    [candidate(text.replaceAll(" ", "")), "QUOTE_NOT_EXACT"],
  ]) {
    const result = validateAnswerCitations(value, bundle);
    assert.equal(result.status, "rejected");
    assert.equal(result.errors[0].code, code);
    assert.equal(result.answer, null);
    assert.deepEqual(result.evidence, []);
  }
});

test("retrieved but omitted passages cannot be cited", () => {
  const omitted = createEvidenceBundle(index, [source], []);
  assert.equal(
    validateAnswerCitations(candidate(), omitted).errors[0].code,
    "SOURCE_NOT_PROVIDED",
  );
});

test("reject malformed answers, missing citations and stale text fingerprints", () => {
  for (const value of [null, [], {}, { ...candidate(), evidence: null }])
    assert.equal(validateAnswerCitations(value, bundle).status, "rejected");
  assert.equal(
    validateAnswerCitations({ ...candidate(), evidence: [] }, bundle).errors[0]
      .code,
    "MISSING_CITATIONS",
  );
  assert.throws(() =>
    createEvidenceBundle(
      index,
      [{ ...source, text: text + "修改" }],
      [source.id],
    ),
  );
  assert.throws(() => createEvidenceBundle(index, [source, source], []));
  assert.throws(() => createEvidenceBundle(index, [source], ["invented"]));
});

test("bundle is immutable and changes are detected after loading persisted data", () => {
  assert.throws(() => (bundle.sources[0].text = "changed"));
  const changed = JSON.parse(JSON.stringify(bundle));
  changed.providedSourceIds = [];
  assert.throws(() => validateAnswerCitations(candidate(), changed));
});

test("insufficient evidence stays an explicit result", () => {
  const result = validateAnswerCitations(
    { decision: "insufficient_evidence", answer: "材料不足。", evidence: [] },
    bundle,
  );
  assert.equal(result.status, "insufficient_evidence");
});
