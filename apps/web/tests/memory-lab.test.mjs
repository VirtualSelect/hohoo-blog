import test from "node:test";
import assert from "node:assert/strict";
import {
  recordedRequest,
  buildMemoryRequest,
  learningEvidence,
  memoryRun,
} from "../lib/memory-lab.mjs";
test("replay never includes a current or future answer in its request", () => {
  for (let i = 0; i < 3; i++) {
    const messages = recordedRequest(i).messages;
    assert.equal(messages.length, i * 2 + 1);
    assert.equal(messages.at(-1).role, "user");
    assert.equal(messages.at(-1).content, memoryRun.turns[i].question);
    assert.ok(!messages.some((m) => m.content === memoryRun.turns[i].answer));
  }
});
test("edited requests preserve chronology, deduplicate and retain the question", () => {
  const request = buildMemoryRequest(["a1", "u1", "u1", "unknown"]);
  assert.deepEqual(
    request.messages.map((m) => m.role),
    ["user", "assistant", "user"],
  );
  assert.equal(request.messages[0].content, "我正在学习Java");
  assert.equal(buildMemoryRequest([]).messages.length, 1);
  assert.equal(request.response, undefined);
});
test("assistant echoes remain evidence after original user fact is removed", () => {
  assert.deepEqual(learningEvidence(["a1"]), ["a1"]);
  assert.deepEqual(learningEvidence(["u0", "a0"]), []);
  assert.equal(learningEvidence(["u1", "a1"]).length, 2);
});
