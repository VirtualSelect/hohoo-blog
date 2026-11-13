import test from "node:test";
import assert from "node:assert/strict";
import {
  createSearchMemory,
  readSearchDraft,
  rememberSearchDraft,
} from "../lib/search-memory.mjs";

test("search keeps one locale-scoped current query without sharing mutable values or history", () => {
  const memory = createSearchMemory();
  memory.remember("zh-CN", { query: "缓存 更慢", mode: "passages" });
  assert.deepEqual(memory.read("zh-CN"), {
    query: "缓存 更慢",
    mode: "passages",
  });
  assert.deepEqual(memory.read("zh-TW"), { query: "", mode: "titles" });
  const copy = memory.read("zh-CN");
  copy.query = "changed outside";
  assert.equal(memory.read("zh-CN").query, "缓存 更慢");
  memory.remember("zh-CN", { query: "864 432", mode: "passages" });
  assert.equal(memory.read("zh-CN").query, "864 432");
  memory.remember("en", { query: "cache slower", mode: "titles" });
  assert.equal(memory.read("en").query, "cache slower");
  assert.deepEqual(memory.read("zh-CN"), { query: "", mode: "titles" });
  memory.remember("en", { query: "", mode: "titles" });
  assert.deepEqual(memory.read("zh-CN"), { query: "", mode: "titles" });
  assert.deepEqual(memory.read("en"), { query: "", mode: "titles" });
  assert.deepEqual(createSearchMemory().read("en"), {
    query: "",
    mode: "titles",
  });
});

test("invalid or oversized drafts cannot replace the last valid query", () => {
  const memory = createSearchMemory();
  memory.remember("zh-CN", {
    query: "valid",
    mode: "titles",
    unused: "not retained",
  });
  for (const draft of [
    null,
    {},
    { query: "x".repeat(181), mode: "titles" },
    { query: "valid", mode: "unknown" },
    { query: 123, mode: "titles" },
  ])
    assert.equal(memory.remember("zh-CN", draft), false);
  assert.equal(
    memory.remember("unknown", { query: "test", mode: "titles" }),
    false,
  );
  assert.deepEqual(memory.read("zh-CN"), { query: "valid", mode: "titles" });
  memory.remember("zh-CN", { query: "   ", mode: "passages" });
  assert.deepEqual(memory.read("zh-CN"), { query: "", mode: "titles" });
});

test("SSR helpers never read or remember a visitor's query", () => {
  assert.equal(typeof window, "undefined");
  assert.equal(
    rememberSearchDraft("zh-CN", { query: "private", mode: "passages" }),
    false,
  );
  assert.deepEqual(readSearchDraft("zh-CN"), { query: "", mode: "titles" });
});
