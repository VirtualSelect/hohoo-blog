"use client";
import { useText } from "./Shell";
import {
  COLS,
  ROWS,
  neighbors,
  willLive,
  type Board,
  type Boundary,
} from "../lib/emergence";
import s from "./EmergenceGarden.module.css";
export default function GardenInspector({
  board,
  previous,
  boundary,
  selected,
  onToggle,
}: {
  board: Board;
  previous?: Board;
  boundary: Boundary;
  selected: number;
  onToggle: (index: number) => void;
}) {
  const t = useText();
  const n = neighbors(board, selected, boundary),
    nextAlive = willLive(board[selected], n);
  const population = board.reduce((sum, value) => sum + value, 0);
  const born = previous
    ? board.filter((value, i) => value && !previous[i]).length
    : 0;
  const lost = previous
    ? board.filter((value, i) => !value && previous[i]).length
    : 0;
  return (
    <aside
      className={s.inspector}
      aria-label={t("局部规则观察窗", "Local rule inspector", "局部規則觀察窗")}
    >
      <p className={s.kicker}>
        {t("一格的命运", "ONE CELL’S FUTURE", "一格的命運")}
      </p>
      <h4>
        {t(
          "只问身边八个邻居。",
          "Ask its eight neighbors.",
          "只問身邊八個鄰居。",
        )}
      </h4>
      <div className={s.neighborhood} aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => {
          const dx = (i % 3) - 1,
            dy = Math.floor(i / 3) - 1;
          let x = (selected % COLS) + dx,
            y = Math.floor(selected / COLS) + dy;
          if (boundary === "wrap") {
            x = (x + COLS) % COLS;
            y = (y + ROWS) % ROWS;
          }
          const alive =
            x >= 0 && x < COLS && y >= 0 && y < ROWS && board[y * COLS + x];
          return (
            <span key={i} data-alive={!!alive} data-center={i === 4}>
              {i === 4 ? "◎" : alive ? "●" : "·"}
            </span>
          );
        })}
      </div>
      <p className={s.verdict}>
        {t(
          `${n} 个活邻居 → 下一代${nextAlive ? "存活" : "空白"}`,
          `${n} live neighbors → ${nextAlive ? "alive" : "empty"} next`,
          `${n} 個活鄰居 → 下一代${nextAlive ? "存活" : "空白"}`,
        )}
      </p>
      <p>
        {board[selected]
          ? n < 2
            ? t(
                "邻居太少，当前细胞消失。",
                "Too few neighbors: this cell dies.",
                "鄰居太少，目前細胞消失。",
              )
            : n > 3
              ? t(
                  "邻居太多，当前细胞消失。",
                  "Too many neighbors: this cell dies.",
                  "鄰居太多，目前細胞消失。",
                )
              : t(
                  "两个或三个邻居，当前细胞继续存活。",
                  "Two or three neighbors: this cell survives.",
                  "兩個或三個鄰居，目前細胞繼續存活。",
                )
          : n === 3
            ? t(
                "恰好三个邻居，空位长出新细胞。",
                "Exactly three neighbors: a new cell is born.",
                "恰好三個鄰居，空位長出新細胞。",
              )
            : t(
                "空位只有在恰好三个邻居时才会新生。",
                "An empty cell is born only with exactly three neighbors.",
                "空位只有在恰好三個鄰居時才會新生。",
              )}
      </p>
      <button onClick={() => onToggle(selected)}>
        {t("翻转选中格", "Toggle selected cell", "翻轉選中格")}
      </button>
      <dl className={s.stats}>
        <div>
          <dt>{t("存活", "Alive", "存活")}</dt>
          <dd>{population}</dd>
        </div>
        <div>
          <dt>{t("新生", "Born", "新生")}</dt>
          <dd>{born}</dd>
        </div>
        <div>
          <dt>{t("消失", "Lost", "消失")}</dt>
          <dd>{lost}</dd>
        </div>
      </dl>
      <p className={s.hint}>
        {t(
          "数字来自当前网格；每代所有格子同时更新。颜色只区分状态，不改变规则。",
          "Counts come from this grid. All cells update simultaneously. Color marks state; it does not change the rule.",
          "數字來自目前網格；每代所有格子同時更新。顏色只區分狀態，不改變規則。",
        )}
      </p>
    </aside>
  );
}
