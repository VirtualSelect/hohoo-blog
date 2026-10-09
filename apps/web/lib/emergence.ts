// A finite teaching implementation of Conway's B3/S23 automaton.
// Reference: https://www.scholarpedia.org/article/Game_of_Life
import type { Locale } from "./site-types";
export const COLS = 24;
export const ROWS = 16;
export const SIZE = COLS * ROWS;
export const HISTORY_LIMIT = 121;
export type Board = number[];
export type Boundary = "closed" | "wrap";
export type Pattern = "garden" | "block" | "blinker" | "glider" | "pulsar";
export const patterns: Pattern[] = [
  "garden",
  "block",
  "blinker",
  "glider",
  "pulsar",
];

const shapes = {
  block: ["OO", "OO"],
  blinker: ["OOO"],
  glider: [".O.", "..O", "OOO"],
  pulsar: [
    "..OOO...OOO..",
    ".............",
    "O....O.O....O",
    "O....O.O....O",
    "O....O.O....O",
    "..OOO...OOO..",
    ".............",
    "..OOO...OOO..",
    "O....O.O....O",
    "O....O.O....O",
    "O....O.O....O",
    ".............",
    "..OOO...OOO..",
  ],
};
function stamp(board: Board, shape: string[], x: number, y: number) {
  shape.forEach((row, dy) =>
    [...row].forEach((c, dx) => {
      if (
        c === "O" &&
        x + dx >= 0 &&
        x + dx < COLS &&
        y + dy >= 0 &&
        y + dy < ROWS
      )
        board[(y + dy) * COLS + x + dx] = 1;
    }),
  );
}
export function makePattern(pattern: Pattern): Board {
  const board = Array<number>(SIZE).fill(0);
  if (pattern === "garden") {
    stamp(board, shapes.glider, 3, 2);
    stamp(board, shapes.glider, 16, 9);
    stamp(board, shapes.blinker, 15, 3);
    stamp(board, shapes.block, 5, 11);
    stamp(board, [".OO", "OO.", ".O."], 11, 7);
  } else {
    const shape = shapes[pattern];
    stamp(
      board,
      shape,
      Math.floor((COLS - shape[0].length) / 2),
      Math.floor((ROWS - shape.length) / 2),
    );
  }
  return board;
}
export function neighbors(
  board: Board,
  index: number,
  boundary: Boundary,
): number {
  const x = index % COLS,
    y = Math.floor(index / COLS);
  let count = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      let nx = x + dx,
        ny = y + dy;
      if (boundary === "wrap") {
        nx = (nx + COLS) % COLS;
        ny = (ny + ROWS) % ROWS;
      }
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS)
        count += board[ny * COLS + nx];
    }
  return count;
}
export function willLive(alive: number, count: number) {
  return Number(count === 3 || (alive === 1 && count === 2));
}
export function evolve(board: Board, boundary: Boundary): Board {
  return board.map((alive, index) =>
    willLive(alive, neighbors(board, index, boundary)),
  );
}
export type Garden = {
  seed: Board;
  frames: Board[];
  cursor: number;
  offset: number;
  boundary: Boundary;
};
export function createGarden(
  seed = makePattern("garden"),
  boundary: Boundary = "closed",
): Garden {
  return {
    seed: [...seed],
    frames: [[...seed]],
    cursor: 0,
    offset: 0,
    boundary,
  };
}
export type GardenAction =
  | { type: "load"; seed: Board; boundary?: Boundary }
  | { type: "step" }
  | { type: "seek"; cursor: number }
  | { type: "toggle"; index: number }
  | { type: "reset" }
  | { type: "boundary"; boundary: Boundary };
export function gardenReducer(state: Garden, action: GardenAction): Garden {
  const board = state.frames[state.cursor];
  switch (action.type) {
    case "load":
      return createGarden(action.seed, action.boundary ?? state.boundary);
    case "reset":
      return createGarden(state.seed, state.boundary);
    case "boundary":
      return createGarden(board, action.boundary);
    case "seek":
      return {
        ...state,
        cursor: Math.max(
          0,
          Math.min(state.frames.length - 1, Math.floor(action.cursor)),
        ),
      };
    case "toggle": {
      if (
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index >= SIZE
      )
        return state;
      const next = [...board];
      next[action.index] = 1 - next[action.index];
      return createGarden(next, state.boundary);
    }
    case "step": {
      const frames = [
        ...state.frames.slice(0, state.cursor + 1),
        evolve(board, state.boundary),
      ];
      const drop = Math.max(0, frames.length - HISTORY_LIMIT);
      return {
        ...state,
        frames: frames.slice(drop),
        cursor: frames.length - drop - 1,
        offset: state.offset + drop,
      };
    }
  }
}

// Fixed-length binary payload. No script, markup, remote URLs or arbitrary JSON.
export function encodeSeed(board: Board, boundary: Boundary): string {
  let hex = "";
  for (let i = 0; i < SIZE; i += 4)
    hex += parseInt(board.slice(i, i + 4).join(""), 2).toString(16);
  return `1.${boundary === "wrap" ? "w" : "c"}.${hex}`;
}
export function decodeSeed(
  input: string,
): { seed: Board; boundary: Boundary } | null {
  if (!new RegExp(`^1\\.[cw]\\.[0-9a-f]{${SIZE / 4}}$`).test(input))
    return null;
  const seed = [...input.slice(4)].flatMap((c) =>
    [...parseInt(c, 16).toString(2).padStart(4, "0")].map(Number),
  );
  return { seed, boundary: input[2] === "w" ? "wrap" : "closed" };
}
export function gardenSvg(
  board: Board,
  boundary: Boundary,
  generation: number,
  locale: Locale = "en",
): string {
  const copy =
    locale === "en"
      ? [
          "Emergence garden",
          "Small rules. Unexpected worlds.",
          boundary === "wrap" ? "wraparound" : "finite",
          `generation ${generation}`,
        ]
      : locale === "zh-TW"
        ? [
            "湧現花園",
            "種下簡單，長出意外。",
            boundary === "wrap" ? "環繞邊界" : "有限邊界",
            `第 ${generation} 代`,
          ]
        : [
            "涌现花园",
            "种下简单，长出意外。",
            boundary === "wrap" ? "环绕边界" : "有限边界",
            `第 ${generation} 代`,
          ];
  const cells = board
    .map((alive, i) =>
      alive
        ? `<rect x="${48 + (i % COLS) * 24}" y="${115 + Math.floor(i / COLS) * 24}" width="18" height="18" rx="5" fill="#467b76"/>`
        : "",
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" xml:lang="${locale}" width="672" height="588" viewBox="0 0 672 588"><title>Hohoo — ${copy[0]}</title><desc>B3/S23 · 24 × 16 · ${boundary} boundary · generation ${generation}. A cellular automaton, not an AI model. Seed: ${encodeSeed(board, boundary)}</desc><rect width="672" height="588" fill="#f6f3ec"/><text x="48" y="48" font-family="sans-serif" font-size="14" fill="#626760">HOHOO / ${copy[0]}</text><text x="48" y="84" font-family="sans-serif" font-size="23" fill="#293e3a">${copy[1]}</text>${cells}<path d="M48 523H624" stroke="#c9cdc4"/><text x="48" y="550" font-family="monospace" font-size="12" fill="#535e58">B3/S23 · ${copy[2]} · ${copy[3]}</text><text x="624" y="573" text-anchor="end" font-family="sans-serif" font-size="12" fill="#535e58">huhohoo.com / build</text></svg>`;
}
