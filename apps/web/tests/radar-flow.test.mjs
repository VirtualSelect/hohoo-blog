import test from "node:test";
import assert from "node:assert/strict";
import {
  signalDays,
  adjacentSignal,
  firstUnreadSignal,
  milestoneType,
  readRadarSection,
} from "../lib/radar-flow.mjs";

const signals = [
  { id: "a", publishedAt: "2026-11-06T17:00:00Z" },
  { id: "b", publishedAt: "2026-11-06T15:00:00Z" },
  { id: "c", publishedAt: "2026-11-06T14:00:00Z" },
];
test("release milestones exclude general analysis and speculative business news", () => {
  assert.equal(milestoneType({ title: "多模态模型正式发布" }), "model");
  assert.equal(
    milestoneType({ title: "Claude Code 推出工具调用更新" }),
    "tool",
  );
  assert.equal(milestoneType({ title: "具身机器人控制代码开源" }), "embodied");
  for (const title of [
    "公司融资并发布估值",
    "据传 GPT 将开源",
    "分析模型推理的工作方式",
    "AI 每日市场观察",
  ])
    assert.equal(milestoneType({ title }), null);
  assert.equal(readRadarSection("?section=milestones"), "milestones");
  assert.equal(readRadarSection("?section=unknown"), "news");
});
test("signal days use source time in UTC+8 and preserve selected order", () => {
  assert.deepEqual(
    signalDays(signals).map(({ day, signals }) => [
      day,
      signals.map((i) => i.id),
    ]),
    [
      ["2026-11-07", ["a"]],
      ["2026-11-06", ["b", "c"]],
    ],
  );
  assert.deepEqual(
    signalDays([...signals].reverse()).map((d) => d.day),
    ["2026-11-06", "2026-11-07"],
  );
});
test("cruise stops at boundaries and can continue after a selected item leaves unread results", () => {
  assert.equal(adjacentSignal(signals, "a", -1), undefined);
  assert.equal(adjacentSignal(signals, "c", 1), undefined);
  assert.equal(adjacentSignal(signals, "b", -1)?.id, "a");
  assert.equal(
    adjacentSignal(
      signals.filter((i) => i.id !== "b"),
      "b",
      1,
    )?.id,
    "a",
  );
  assert.equal(adjacentSignal([], "a", 1), undefined);
});
test("cruise starts with an unread item without marking or mutating anything", () => {
  const read = ["a", "b"];
  assert.equal(firstUnreadSignal(signals, read)?.id, "c");
  assert.equal(firstUnreadSignal(signals, ["a", "b", "c"])?.id, "a");
  assert.equal(firstUnreadSignal([], [])?.id, undefined);
  assert.deepEqual(read, ["a", "b"]);
});
