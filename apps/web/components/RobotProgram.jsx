"use client";
import { useState } from "react";
import { initialRobot, stepRobot } from "../lib/robot-program.mjs";
import { DEFAULT_WALLS, GOAL, START } from "../lib/grid-path.mjs";
import grid from "./GridRobot.module.css";
import styles from "./LearningExercises.module.css";
export default function RobotProgram({ locale }) {
  const t = (zh, en, tw) =>
    locale === "en" ? en : locale === "zh-TW" ? tw : zh;
  const [program, setProgram] = useState([]),
    [robot, setRobot] = useState(initialRobot),
    [command, setCommand] = useState("forward"),
    [repeat, setRepeat] = useState(1);
  const names = {
    forward: t("前进", "Forward", "前進"),
    left: t("左转", "Turn left", "左轉"),
    right: t("右转", "Turn right", "右轉"),
  };
  const directions = [
    t("北", "North", "北"),
    t("东", "East", "東"),
    t("南", "South", "南"),
    t("西", "West", "西"),
  ];
  const reset = () => setRobot(initialRobot());
  return (
    <section className={styles.exercise} aria-labelledby="program-title">
      <p className="eyebrow">
        {t(
          "动手理解 / 行动与反馈",
          "Try it / Actions and feedback",
          "動手理解 / 行動與回饋",
        )}
      </p>
      <h2 id="program-title">
        {t("给机器人写一段指令", "Program the robot", "給機器人寫一段指令")}
      </h2>
      <p>
        {t(
          "从左下角出发，朝北。用前进、转向和重复到达右上角；遇到障碍会停在出错指令，修改后从头验证。",
          "Start at bottom left facing north. Add moves, turns and repeats to reach the top right. Collisions stop at the failing instruction; edit and replay from the start.",
          "從左下角出發，朝北。用前進、轉向和重複到達右上角；遇到障礙會停在出錯指令，修改後從頭驗證。",
        )}
      </p>
      <p className={styles.muted}>
        {t(
          "固定规则教学地图，不是 AI 或物理仿真。重复会展开为独立指令，最多 40 步；不保存。",
          "Fixed rule-based teaching map, not AI or physics. Repeats expand into instructions, capped at 40; nothing is saved.",
          "固定規則教學地圖，不是 AI 或物理模擬。重複會展開為獨立指令，最多 40 步；不儲存。",
        )}
      </p>
      <div className={grid.layout}>
        <div>
          <div
            className={grid.grid}
            role="img"
            aria-label={t(
              "五行五列地图。起点第五行第一列，目标第一行第五列。障碍位于第二、三、四行的第三列。当前位置与方向见状态。",
              "Five by five map. Start row 5 column 1; goal row 1 column 5. Obstacles at column 3 in rows 2, 3 and 4. Current position and direction are in the status.",
              "五行五列地圖。起點第五行第一列，目標第一行第五列。障礙位於第二、三、四行的第三列。目前位置與方向見狀態。",
            )}
          >
            {Array.from({ length: 25 }, (_, cell) => (
              <span
                key={cell}
                className={grid.cell}
                data-robot={cell === robot.position || undefined}
                data-wall={DEFAULT_WALLS.includes(cell) || undefined}
                style={{ display: "grid", placeItems: "center" }}
                aria-hidden="true"
              >
                {cell === robot.position
                  ? ["↑", "→", "↓", "←"][robot.direction]
                  : cell === GOAL
                    ? "◎"
                    : DEFAULT_WALLS.includes(cell)
                      ? "■"
                      : cell === START
                        ? "○"
                        : ""}
              </span>
            ))}
          </div>
          <p className={styles.muted}>
            {t(
              "箭头为朝向，◎ 为目标，■ 为障碍；每次转向 90°。",
              "Arrow: heading; ◎ goal; ■ obstacle. Each turn is 90°.",
              "箭頭為朝向，◎ 為目標，■ 為障礙；每次轉向 90°。",
            )}
          </p>
        </div>
        <div>
          <div className={styles.choices}>
            <label>
              {t("动作", "Action", "動作")}
              <select
                value={command}
                onChange={(e) => setCommand(e.target.value)}
              >
                {Object.entries(names).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("重复次数", "Repeat count", "重複次數")}
              <select
                value={repeat}
                onChange={(e) => setRepeat(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              disabled={program.length + repeat > 40}
              onClick={() => {
                setProgram([...program, ...Array(repeat).fill(command)]);
                reset();
              }}
            >
              {t("追加指令", "Append", "追加指令")}
            </button>
          </div>
          <ol className={styles.program}>
            {program.map((cmd, i) => (
              <li
                key={i}
                aria-current={i === robot.cursor ? "step" : undefined}
              >
                {names[cmd]}{" "}
                <button
                  aria-label={`${t("删除第", "Remove instruction", "刪除第")} ${i + 1}`}
                  onClick={() => {
                    setProgram(program.filter((_, j) => j !== i));
                    reset();
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          {!program.length && (
            <p>
              {t(
                "还没有指令，先追加一个动作。",
                "No instructions yet. Append an action.",
                "還沒有指令，先追加一個動作。",
              )}
            </p>
          )}
          <div role="status" className={styles.result}>
            {t("位置（行，列）", "Position (row, column)", "位置（行，列）")}：
            {Math.floor(robot.position / 5) + 1}, {(robot.position % 5) + 1} ·{" "}
            {directions[robot.direction]}
            <br />
            {robot.blocked
              ? t(
                  `第 ${robot.cursor + 1} 条被阻挡：前方是障碍或边界。`,
                  `Instruction ${robot.cursor + 1} blocked by a wall or boundary.`,
                  `第 ${robot.cursor + 1} 條被阻擋：前方是障礙或邊界。`,
                )
              : robot.position === GOAL
                ? t("到达目标！", "Goal reached!", "到達目標！")
                : robot.cursor === program.length && program.length
                  ? t(
                      "指令执行完毕，尚未到达目标。",
                      "Program finished; goal not reached.",
                      "指令執行完畢，尚未到達目標。",
                    )
                  : t(
                      `已执行 ${robot.cursor} 条`,
                      `Executed ${robot.cursor} instructions`,
                      `已執行 ${robot.cursor} 條`,
                    )}
          </div>
          <div className={styles.choices}>
            <button
              disabled={
                robot.blocked ||
                robot.position === GOAL ||
                robot.cursor >= program.length
              }
              onClick={() =>
                setRobot((s) => stepRobot(s, program, DEFAULT_WALLS))
              }
            >
              {t("执行下一条", "Execute next", "執行下一條")}
            </button>
            <button onClick={reset}>
              {t("重新执行", "Replay", "重新執行")}
            </button>
            <button
              onClick={() => {
                setProgram([]);
                reset();
              }}
            >
              {t("清空指令", "Clear program", "清空指令")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
