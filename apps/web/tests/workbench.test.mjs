import test from "node:test";
import assert from "node:assert/strict";
import { decide, inspectJson } from "../lib/workbench.mjs";
test("permissions and consequential actions override confidence", () => {
  assert.equal(
    decide({
      allowed: false,
      destructive: false,
      confidence: 100,
      threshold: 0,
    }),
    "blocked",
  );
  assert.equal(
    decide({ allowed: true, destructive: true, confidence: 100, threshold: 0 }),
    "review",
  );
  assert.equal(
    decide({
      allowed: true,
      destructive: false,
      confidence: 79,
      threshold: 80,
    }),
    "review",
  );
  assert.equal(
    decide({
      allowed: true,
      destructive: false,
      confidence: 80,
      threshold: 80,
    }),
    "proceed",
  );
  assert.equal(
    decide({ allowed: true, confidence: NaN, threshold: 80 }),
    "review",
  );
});
test("JSON lens distinguishes values and handles hostile keys as data", () => {
  const result = inspectJson(
    '{"flag":false,"text":"false","empty":null,"__proto__":{"polluted":true}}',
  );
  assert.deepEqual(
    result.rows.slice(1, 4).map((r) => r.type),
    ["boolean", "string", "null"],
  );
  assert.equal({}.polluted, undefined);
  assert.ok(result.rows.find((r) => r.path.includes("__proto__")));
  assert.equal(inspectJson("{").error, "syntax");
  assert.equal(inspectJson(" ".repeat(20001)).error, "size");
  assert.ok(
    inspectJson(JSON.stringify(Array.from({ length: 200 }, () => 1))).rows
      .length <= 100,
  );
});
