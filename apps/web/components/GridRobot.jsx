"use client";
import { useState } from "react";
import {
  GRID_SIZE,
  START,
  GOAL,
  DEFAULT_WALLS,
  gridPath,
  visibleCells,
} from "../lib/grid-path.mjs";
import styles from "./GridRobot.module.css";

export default function GridRobot({ locale }) {
  const t = (zh, en, tw) =>
    locale === "en" ? en : locale === "zh-TW" ? tw : zh;
  const [walls, setWalls] = useState(DEFAULT_WALLS);
  const [position, setPosition] = useState(START);
  const [moves, setMoves] = useState(0);
  const [showPath, setShowPath] = useState(false);
  const [local, setLocal] = useState(false);
  const [seen, setSeen] = useState(() => visibleCells(START));
  const path = gridPath(
    local ? walls.filter((cell) => seen.includes(cell)) : walls,
    position,
  );
  const arrived = position === GOAL;
  const location = (cell) =>
    `${Math.floor(cell / GRID_SIZE) + 1}, ${(cell % GRID_SIZE) + 1}`;
  function toggle(cell) {
    if (cell === START || cell === GOAL) return;
    setWalls((current) =>
      current.includes(cell)
        ? current.filter((x) => x !== cell)
        : [...current, cell],
    );
    setPosition(START);
    setMoves(0);
    setSeen(visibleCells(START));
  }
  return (
    <section className={styles.lab} aria-labelledby="grid-robot-title">
      <p className="eyebrow">
        {t(
          "动手理解 / 规则演示",
          "Try it / Rule-based demo",
          "動手理解 / 規則演示",
        )}
      </p>
      <h2 id="grid-robot-title">
        {t(
          "给机器人出一道绕路题",
          "Give a robot a detour",
          "給機器人出一道繞路題",
        )}
      </h2>
      <p>
        {t(
          "点击格子放置或移除障碍，再逐步前进。试试封住起点的两个出口，会发生什么？",
          "Toggle obstacles, then move one step at a time. What happens if you block both exits from the start?",
          "點擊格子放置或移除障礙，再逐步前進。試試封住起點的兩個出口，會發生什麼？",
        )}
      </p>
      <p className={styles.note}>
        {t(
          "二维网格教学示意 · 非 AI 模型、物理仿真或真实实验成果",
          "2D teaching grid · Not an AI model, physics simulation, or experimental result",
          "二維網格教學示意 · 非 AI 模型、物理模擬或真實實驗成果",
        )}
      </p>
      <label className={styles.preview}>
        <input
          type="checkbox"
          checked={local}
          onChange={(e) => {
            setLocal(e.target.checked);
            setPosition(START);
            setMoves(0);
            setSeen(visibleCells(START));
          }}
        />
        {t(
          "局部视野：只观察相邻格",
          "Local vision: observe adjacent cells only",
          "局部視野：只觀察相鄰格",
        )}
      </label>
      {local && (
        <p className={styles.note}>
          {t(
            "？是尚未观察的格子。规划暂把未知当作空地，每走一步观察并重新规划，路线可能改变，步数不再保证全局最短。目标位置已知；先关闭局部视野编辑地图，再开启探索。",
            "? means unobserved. Planning tentatively treats unknown cells as free, observes after each move, and replans. The path may change and total moves need not be globally shortest. The goal is known. Turn local vision off to edit the map.",
            "？是尚未觀察的格子。規劃暫把未知當作空地，每走一步觀察並重新規劃，路線可能改變，步數不再保證全域最短。目標位置已知；先關閉局部視野編輯地圖，再開啟探索。",
          )}
        </p>
      )}
      <div className={styles.layout}>
        <div>
          <div
            className={styles.grid}
            role="group"
            aria-label={t(
              "五行五列地图，坐标为行、列",
              "Five by five map; coordinates are row, column",
              "五行五列地圖，座標為行、列",
            )}
          >
            {Array.from({ length: GRID_SIZE ** 2 }, (_, cell) => {
              const unknown = local && !seen.includes(cell) && cell !== GOAL;
              const wall = walls.includes(cell) && !unknown,
                robot = position === cell;
              const label = robot
                ? t("机器人", "Robot", "機器人")
                : cell === GOAL
                  ? t("目标", "Goal", "目標")
                  : cell === START
                    ? t("起点", "Start", "起點")
                    : unknown
                      ? t("未观察", "Unobserved", "未觀察")
                      : wall
                        ? t(
                            "障碍，点击移除",
                            "Obstacle, click to remove",
                            "障礙，點擊移除",
                          )
                        : t(
                            "空地，点击放置障碍",
                            "Empty, click to add obstacle",
                            "空地，點擊放置障礙",
                          );
              return (
                <button
                  type="button"
                  key={cell}
                  className={styles.cell}
                  data-wall={wall || undefined}
                  data-robot={robot || undefined}
                  aria-label={`${location(cell)} · ${label}`}
                  disabled={local || cell === START || cell === GOAL}
                  onClick={() => toggle(cell)}
                >
                  <span aria-hidden="true">
                    {robot
                      ? "●"
                      : cell === GOAL
                        ? "◎"
                        : cell === START
                          ? "○"
                          : unknown
                            ? "?"
                            : wall
                              ? "■"
                              : showPath && path.includes(cell)
                                ? "·"
                                : ""}
                  </span>
                </button>
              );
            })}
          </div>
          <p className={styles.legend}>
            {t(
              "● 机器人　○ 起点　◎ 目标　■ 障碍",
              "● Robot　○ Start　◎ Goal　■ Obstacle",
              "● 機器人　○ 起點　◎ 目標　■ 障礙",
            )}
          </p>
          <label className={styles.preview}>
            <input
              type="checkbox"
              checked={showPath}
              onChange={(e) => setShowPath(e.target.checked)}
            />
            {t("显示规划路线", "Show planned path", "顯示規劃路線")}
          </label>
        </div>
        <div>
          <div className={styles.status} role="status" aria-live="polite">
            <h3>
              {arrived
                ? t("到达目标了", "Goal reached", "到達目標了")
                : path.length
                  ? local
                    ? t(
                        "当前有候选路线",
                        "A tentative route exists",
                        "目前有候選路線",
                      )
                    : t("有路可走", "A route exists", "有路可走")
                  : t(
                      "此地图没有可行路线",
                      "No route on this map",
                      "此地圖沒有可行路線",
                    )}
            </h3>
            <p>
              {t(
                "当前位置（行，列）",
                "Position (row, column)",
                "目前位置（行，列）",
              )}
              ：{location(position)}
            </p>
            <p>
              {t("本次已走", "Moves made", "本次已走")}：{moves} ·{" "}
              {local
                ? t("候选剩余步数", "Tentative moves left", "候選剩餘步數")
                : t("剩余步数", "Moves remaining", "剩餘步數")}
              ：{path.length ? path.length - 1 : "—"}
            </p>
            {!path.length && (
              <p>
                {t(
                  "移除一个障碍再试试。没有路线时，不会穿墙或假装成功。",
                  "Remove an obstacle and try again. The robot cannot walk through walls or claim success without a route.",
                  "移除一個障礙再試試。沒有路線時，不會穿牆或假裝成功。",
                )}
              </p>
            )}
          </div>
          <div className={styles.controls}>
            <button
              type="button"
              disabled={arrived || path.length < 2}
              onClick={() => {
                setPosition(path[1]);
                setSeen((known) => [
                  ...new Set([...known, ...visibleCells(path[1])]),
                ]);
                setMoves((n) => n + 1);
              }}
            >
              {t("前进一步", "Move one step", "前進一步")} →
            </button>
            <button
              type="button"
              onClick={() => {
                setPosition(START);
                setMoves(0);
                setSeen(visibleCells(START));
              }}
            >
              {t("回到起点", "Back to start", "回到起點")}
            </button>
            <button
              type="button"
              onClick={() => {
                setWalls(DEFAULT_WALLS);
                setSeen(visibleCells(START));
                setPosition(START);
                setMoves(0);
                setShowPath(false);
              }}
            >
              {t("恢复地图", "Reset map", "恢復地圖")}
            </button>
          </div>
          <p className={styles.note}>
            {t(
              "修改障碍会回到起点。地图和操作不保存。步数是当前规则网格的计算结果，不是机器人性能指标。",
              "Editing obstacles resets the robot. This map is not saved. Move counts describe this grid, not robot performance.",
              "修改障礙會回到起點。地圖和操作不儲存。步數是目前規則網格的計算結果，不是機器人效能指標。",
            )}
          </p>
          <details>
            <summary>
              {t(
                "它是怎么决定下一步的？",
                "How does it choose a move?",
                "它是怎麼決定下一步的？",
              )}
            </summary>
            <p>
              {t(
                "广度优先搜索（BFS）从当前位置向四邻格扩展，寻找等步长网格上的最短路线。不走斜线；有多条最短路线时，按上、右、下、左的搜索顺序选一条。这里没有学习或训练。",
                "Breadth-first search (BFS) explores four neighbours to find a shortest path on this equal-cost grid. It never moves diagonally; ties follow up, right, down, left search order. No learning or training takes place.",
                "廣度優先搜尋（BFS）從目前位置向四鄰格擴展，尋找等步長網格上的最短路線。不走斜線；有多條最短路線時，按上、右、下、左的搜尋順序選一條。這裡沒有學習或訓練。",
              )}
            </p>
            <p>
              {t(
                "真实机器人还要处理感知误差、碰撞形状、运动约束与动态环境。这个小地图只帮助理解“环境变化会影响规划与行动”。",
                "Real robots also face perception error, collision geometry, motion constraints, and dynamic environments. This grid only illustrates how environmental changes affect planning and action.",
                "真實機器人還要處理感知誤差、碰撞形狀、運動約束與動態環境。這個小地圖只幫助理解「環境變化會影響規劃與行動」。",
              )}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
