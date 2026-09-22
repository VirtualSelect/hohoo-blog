// Author-provided console transcript, also documented in java-first-llm.md.
// These are historical observations, never synthetic model responses.
export const memoryRun = {
  model: "agnes-2.5-flash",
  source: "/docs/ai-apps/java-first-llm",
  turns: [
    {
      question: "你好",
      answer: "你好！我是 Agnes，由 Sapiens AI 开发。有什么我可以帮你的吗？",
      usage: [285, 60, 345],
    },
    {
      question: "我正在学习Java",
      answer:
        "很好！Java 是一门非常实用且广泛应用的编程语言。如果你在学习过程中遇到任何问题，比如语法、面向对象概念、集合框架、异常处理等，随时可以问我。加油！",
      usage: [318, 75, 393],
    },
    {
      question: "我正在学习什么",
      answer: "你正在学习 Java！如果需要帮助或有任何问题，随时告诉我。",
      usage: [368, 81, 449],
    },
  ],
};
export const recordedHistory = memoryRun.turns
  .slice(0, 2)
  .flatMap((turn, i) => [
    { id: `u${i}`, role: "user", content: turn.question },
    { id: `a${i}`, role: "assistant", content: turn.answer },
  ]);
export function buildMemoryRequest(ids) {
  const selected = new Set(ids);
  return {
    model: memoryRun.model,
    messages: [
      ...recordedHistory
        .filter((m) => selected.has(m.id))
        .map(({ role, content }) => ({ role, content })),
      { role: "user", content: memoryRun.turns[2].question },
    ],
  };
}
export function learningEvidence(ids) {
  return recordedHistory
    .filter((m) => ids.includes(m.id) && /Java/.test(m.content))
    .map((m) => m.id);
}
export function recordedRequest(turn) {
  const index = Math.max(0, Math.min(2, Number.isInteger(turn) ? turn : 0));
  return {
    model: memoryRun.model,
    messages: [
      ...memoryRun.turns.slice(0, index).flatMap((t) => [
        { role: "user", content: t.question },
        { role: "assistant", content: t.answer },
      ]),
      { role: "user", content: memoryRun.turns[index].question },
    ],
  };
}
