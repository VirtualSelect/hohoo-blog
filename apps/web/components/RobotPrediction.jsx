"use client";
import { useState } from "react";
import { stepRobot } from "../lib/robot-program.mjs";
import styles from "./LearningExercises.module.css";
import grid from "./GridRobot.module.css";
const puzzles = [
  { position: 20, direction: 0, command: "forward", walls: [15] },
  { position: 16, direction: 1, command: "left", walls: [11, 17] },
  { position: 21, direction: 1, command: "forward", walls: [16] },
];
export default function RobotPrediction() {
  const [index, setIndex] = useState(0),
    [guess, setGuess] = useState(null);
  const p = puzzles[index],
    before = { ...p, cursor: 0, blocked: false },
    after = stepRobot(before, [p.command], p.walls);
  const answer = after.blocked
    ? "blocked"
    : after.position !== p.position
      ? "move"
      : "turn";
  const t = useText();
  const names = {
    blocked: t("碰壁停下", "Stop at obstacle", "碰壁停下"),
    move: t("向前移动", "Move forward", "向前移動"),
    turn: t("原地转向", "Turn in place", "原地轉向"),
  };
  const displayed = guess ? after : before;
  return (
    <section className={styles.exercise}>
      <h2>
        {t("预测机器人的下一步", "Predict the next move", "預測機器人的下一步")}
      </h2>
      <p>
        {t(
          "三个固定规则谜题。先观察朝向与障碍，再预测；不记录分数，不代表机器人能力评测。",
          "Three fixed rule-based puzzles. Inspect heading and obstacles before guessing. No scores or robot benchmarks.",
          "三個固定規則謎題。先觀察朝向與障礙，再預測；不記錄分數，不代表機器人能力評測。",
        )}
      </p>
      <div className={styles.choices}>
        {puzzles.map((_, i) => (
          <button
            key={i}
            aria-pressed={index === i}
            onClick={() => {
              setIndex(i);
              setGuess(null);
            }}
          >
            {t("谜题", "Puzzle", "謎題")} {i + 1}
          </button>
        ))}
      </div>
      <div
        className={grid.grid}
        style={{ maxWidth: 300 }}
        role="img"
        aria-label={t(
          `起点行列 ${Math.floor(p.position / 5) + 1},${(p.position % 5) + 1}；障碍：${p.walls.map((c) => `${Math.floor(c / 5) + 1},${(c % 5) + 1}`).join("; ")}`,
          `Start row,column ${Math.floor(p.position / 5) + 1},${(p.position % 5) + 1}; obstacles: ${p.walls.map((c) => `${Math.floor(c / 5) + 1},${(c % 5) + 1}`).join("; ")}`,
          `起點行列 ${Math.floor(p.position / 5) + 1},${(p.position % 5) + 1}；障礙：${p.walls.map((c) => `${Math.floor(c / 5) + 1},${(c % 5) + 1}`).join("; ")}`,
        )}
      >
        {Array.from({ length: 25 }, (_, c) => (
          <span
            key={c}
            className={grid.cell}
            style={{ display: "grid", placeItems: "center" }}
            data-robot={c === displayed.position || undefined}
            data-wall={p.walls.includes(c) || undefined}
            aria-hidden="true"
          >
            {c === displayed.position
              ? ["↑", "→", "↓", "←"][displayed.direction]
              : p.walls.includes(c)
                ? "■"
                : ""}
          </span>
        ))}
      </div>
      <p>
        {t("执行前朝向", "Initial heading", "執行前朝向")}：
        {
          [
            t("北", "North", "北"),
            t("东", "East", "東"),
            t("南", "South", "南"),
            t("西", "West", "西"),
          ][p.direction]
        }{" "}
        · {t("指令", "Instruction", "指令")}：
        {p.command === "left"
          ? t("左转 90°", "Turn left 90°", "左轉 90°")
          : t("前进一格", "Forward one cell", "前進一格")}
      </p>
      <div className={styles.choices}>
        {Object.entries(names).map(([key, label]) => (
          <button
            key={key}
            disabled={guess !== null}
            onClick={() => setGuess(key)}
          >
            {label}
          </button>
        ))}
        <button onClick={() => setGuess(null)}>
          {t("再猜一次", "Try again", "再猜一次")}
        </button>
      </div>
      {guess && (
        <p className={styles.result} role="status">
          {guess === answer
            ? t("预测正确。", "Correct prediction.", "預測正確。")
            : t("再观察一下。", "Take another look.", "再觀察一下。")}{" "}
          {t("规则执行结果", "Rule result", "規則執行結果")}：{names[answer]}。
          {answer === "blocked"
            ? t(
                "前方是障碍，位置保持不变。",
                "The next cell is blocked; position stays unchanged.",
                "前方是障礙，位置保持不變。",
              )
            : answer === "turn"
              ? t(
                  "转向只改变朝向，不改变位置。",
                  "Turning changes heading, not position.",
                  "轉向只改變朝向，不改變位置。",
                )
              : t(
                  "前方为空地，沿当前朝向移动一格。",
                  "The next cell is free; move one cell along the current heading.",
                  "前方為空地，沿目前朝向移動一格。",
                )}
        </p>
      )}
    </section>
  );
}
import { useText } from "./Shell";
