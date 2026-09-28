import test from "node:test";
import assert from "node:assert/strict";
import { validateOutput as validate } from "../lib/output-contract.mjs";
const valid = '{"category":"llm","tags":["context"]}';
test("reject syntax, duplicate keys (including escaped aliases), unknown fields and ambiguous fences", () => {
  for (const body of [
    valid + valid,
    '{"category":"llm","\\u0063ategory":"ai-apps","tags":["x"]}',
    '{"category":"llm","tags":["x"],"extra":1}',
    "prefix " + valid,
    "```json\n" + valid + "\n```",
  ])
    assert.notEqual(validate(body).code, "accepted");
  assert.equal(
    validate("```json\n" + valid + "\n```", { unwrap: true }).code,
    "accepted",
  );
  assert.notEqual(
    validate("prefix ```json\n" + valid + "\n```", { unwrap: true }).code,
    "accepted",
  );
  assert.equal(validate(valid, { finish: "length" }).stage, 1);
});
test("business boundaries, UTF-16 input budget and Unicode code-point tag length", () => {
  const body = (tags) => JSON.stringify({ category: "llm", tags });
  for (const tags of [
    [],
    ["a", "b", "c", "d"],
    ["x", "x"],
    [1],
    [" x"],
    [""],
    ["a\u0085"],
    ["😀".repeat(21)],
  ])
    assert.notEqual(validate(body(tags)).code, "accepted");
  for (const tags of [["😀".repeat(20)], ["{key}:value"]])
    assert.equal(validate(body(tags)).code, "accepted");
  assert.equal(validate(valid.padEnd(8000, " ")).code, "accepted");
  assert.notEqual(validate(valid.padEnd(8001, " ")).code, "accepted");
  assert.equal(validate("null").code, "object_required");
});
