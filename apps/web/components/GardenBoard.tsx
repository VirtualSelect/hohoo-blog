"use client";
import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { COLS, ROWS, SIZE, type Board } from "../lib/emergence";
import { useText } from "./Shell";
import s from "./EmergenceGarden.module.css";

type Props = {
  board: Board;
  previous?: Board;
  trail: Set<number>;
  selected: number;
  edit: boolean;
  zoom: boolean;
  onSelect: (index: number) => void;
  onToggle: (index: number) => void;
  onGlider: () => void;
};
export default function GardenBoard({
  board,
  previous,
  trail,
  selected,
  edit,
  zoom,
  onSelect,
  onToggle,
  onGlider,
}: Props) {
  const t = useText();
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  function key(event: KeyboardEvent, index: number) {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLS,
      ArrowDown: COLS,
    };
    if (event.key in moves) {
      event.preventDefault();
      const next = Math.max(0, Math.min(SIZE - 1, index + moves[event.key]));
      onSelect(next);
      cells.current[next]?.focus({ preventScroll: true });
      cells.current[next]?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    } else if (
      event.key.toLowerCase() === "g" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onGlider();
    }
  }
  return (
    <div className={s.boardViewport}>
      <div
        className={s.board}
        data-zoom={zoom}
        role="grid"
        aria-label={t(
          "细胞花园：方向键移动，回车选择；种植模式下回车翻转格子",
          "Cell garden: arrows move, Enter selects; in planting mode Enter toggles a cell",
          "細胞花園：方向鍵移動，Enter 選擇；種植模式下 Enter 翻轉格子",
        )}
        aria-rowcount={ROWS}
        aria-colcount={COLS}
      >
        {Array.from({ length: ROWS }, (_, y) => (
          <div key={y} role="row" className={s.boardRow}>
            {Array.from({ length: COLS }, (_, x) => {
              const i = y * COLS + x;
              const state = board[i]
                ? previous && !previous[i]
                  ? "born"
                  : "alive"
                : trail.has(i)
                  ? "trail"
                  : "empty";
              return (
                <button
                  key={i}
                  ref={(el) => {
                    cells.current[i] = el;
                  }}
                  role="gridcell"
                  type="button"
                  className={s.cell}
                  data-state={state}
                  aria-selected={selected === i}
                  tabIndex={selected === i ? 0 : -1}
                  aria-label={t(
                    `第 ${y + 1} 行，第 ${x + 1} 列，${board[i] ? "存活" : "空白"}`,
                    `Row ${y + 1}, column ${x + 1}, ${board[i] ? "alive" : "empty"}`,
                    `第 ${y + 1} 列，第 ${x + 1} 欄，${board[i] ? "存活" : "空白"}`,
                  )}
                  onFocus={() => onSelect(i)}
                  onKeyDown={(e) => key(e, i)}
                  onClick={() => {
                    onSelect(i);
                    if (edit) onToggle(i);
                  }}
                >
                  <span aria-hidden="true" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
