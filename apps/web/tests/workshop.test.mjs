import test from "node:test";
import assert from "node:assert/strict";
import {
  failureReducer as reduce,
  initialFailureState,
} from "../lib/failure-lab.mjs";
import {
  workshops,
  workshopSearchEntries,
  filterWorkshops,
} from "../lib/workshop-catalog.mjs";
import fs from "node:fs";

test("failure recovery commits one complete turn without duplicate user input", () => {
  let s = initialFailureState();
  s = reduce(s, { type: "send", question: "test" });
  assert.equal(s.safe.length, 0);
  assert.equal(s.naive.length, 1);
  assert.deepEqual(s.pending.request, [{ role: "user", content: "test" }]);
  s = reduce(s, { type: "resolve", id: 1, outcome: "timeout" });
  assert.equal(s.safe.length, 0);
  s = reduce(s, { type: "send", question: "test" });
  s = reduce(s, { type: "resolve", id: 2, outcome: "success" });
  assert.deepEqual(
    s.safe.map((m) => m.role),
    ["user", "assistant"],
  );
  assert.deepEqual(
    s.naive.map((m) => m.role),
    ["user", "user", "assistant"],
  );
});
test("all failure modes preserve committed history; stale or duplicate responses cannot commit", () => {
  let s = reduce(initialFailureState(), { type: "send", question: "first" });
  s = reduce(s, { type: "resolve", id: 1, outcome: "success" });
  for (const outcome of [
    "timeout",
    "http-error",
    "invalid-json",
    "empty-answer",
  ]) {
    const before = structuredClone(s.safe);
    s = reduce(s, { type: "send", question: "next" });
    assert.equal(reduce(s, { type: "send", question: "double click" }), s);
    assert.equal(reduce(s, { type: "resolve", id: 1, outcome: "success" }), s);
    const id = s.pending.id;
    s = reduce(s, { type: "resolve", id, outcome });
    assert.deepEqual(s.safe, before);
    assert.equal(reduce(s, { type: "resolve", id, outcome: "success" }), s);
  }
  assert.deepEqual(reduce(s, { type: "reset" }), initialFailureState());
});
test("empty input and repeated runs stay bounded", () => {
  let s = initialFailureState();
  assert.equal(reduce(s, { type: "send", question: "  " }), s);
  for (let i = 0; i < 8; i++) {
    s = reduce(s, { type: "send", question: "x" });
    s = reduce(s, { type: "resolve", id: s.pending.id, outcome: "success" });
  }
  assert.equal(reduce(s, { type: "send", question: "x" }), s);
});
test("catalog filters all terms and directions without inventing entries", () => {
  assert.equal(new Set(workshops.map((w) => w.id)).size, workshops.length);
  assert.deepEqual(
    filterWorkshops({ query: " json ", locale: "en" }).map((w) => w.id),
    ["json-desk"],
  );
  assert.equal(
    filterWorkshops({ domain: "embodied-ai", query: "JSON" }).length,
    0,
  );
  assert.equal(filterWorkshops({ query: "nonsense!" }).length, 0);
  assert.equal(filterWorkshops({ domain: "llm" }).length, 2);
});
for (const locale of ["zh-CN", "en", "zh-TW"])
  test(`${locale}: workshop links resolve and stay outside article/activity indexes`, () => {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const prefix = locale === "zh-CN" ? "" : `/${locale}`;
    for (const w of workshops) {
      assert(data.routes.includes(w.href.slice(1)));
      assert.equal(w.title.length, 3);
      assert.equal(w.task.length, 3);
    }
    for (const e of workshopSearchEntries(locale)) {
      assert(data.search.some((x) => x.id === e.id && x.href === e.href));
      assert(e.href.startsWith(prefix + "/build?tool="));
      assert(
        !data.globalData["content-index"].entries.some((x) => x.id === e.id),
      );
    }
  });
