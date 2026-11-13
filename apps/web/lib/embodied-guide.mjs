import {
  readEvidenceTable,
  pinnedEvidenceLinks,
} from "./question-evidence.mjs";
export const completionConditions = [
  "正常",
  "下降短暂缺测",
  "下降松爪",
  "下降永久缺测",
  "释放后推动",
  "释放后静默",
  "单条坏观测",
  "重放旧观测",
];
const conditionIds = [
  "normal",
  "lower-gap",
  "lower-drop",
  "lower-missing",
  "post-push",
  "post-silence",
  "bad-sample",
  "stale-replay",
];
export function embodiedGuideEvidence(read) {
  const doc = "embodied-ai/mujoco-qualified-completion";
  const source = read("docs/" + doc + ".md");
  const start = source.indexOf("| 条件 | 最终物理验收 |");
  if (start < 0) throw Error("Missing completion outcome table");
  // Select the results, not the earlier table describing injected faults.
  const rows = readEvidenceTable(source.slice(start), "条件");
  if (
    rows.length !== 8 ||
    new Set(rows.map((row) => row[0])).size !== 8 ||
    completionConditions.some((name) => !rows.some((row) => row[0] === name))
  )
    throw Error("Unexpected completion outcome matrix");
  const valid = new Set(["VALID", "INVALID", "UNKNOWN", "ABORTED"]);
  const cases = rows.map(([name, physical, ever, current, qualified]) => {
    if (
      !["通过", "未通过"].includes(physical) ||
      !["是", "否"].includes(ever) ||
      !["VALID", "INVALID", "UNKNOWN"].includes(current) ||
      !valid.has(qualified)
    )
      throw Error("Invalid archived completion state");
    return {
      name,
      id: conditionIds[completionConditions.indexOf(name)],
      physical: physical === "通过",
      ever: ever === "是",
      current,
      qualified,
    };
  });
  const duration = source.match(/每回合\s+(\d+)s/);
  const correction = source.match(
    /\[修正版代码与回归命令\]\((https:\/\/github\.com\/VirtualSelect\/hohoo-embodied-agent\/blob\/[a-f0-9]{40}\/[^)]+)\)/,
  );
  if (!duration || !correction)
    throw Error("Missing archive scope or correction link");
  return {
    source: pinnedEvidenceLinks(source, doc),
    correction: correction[1],
    durationSeconds: Number(duration[1]),
    defaultCase: "lower-drop",
    cases,
  };
}
