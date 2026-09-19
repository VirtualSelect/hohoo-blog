export const GRID_SIZE = 5;
export const START = 20;
export const GOAL = 4;
export const DEFAULT_WALLS = [7, 12, 17];

export function visibleCells(position) {
  return Array.from({ length: 25 }, (_, i) => i).filter(
    (i) =>
      Math.abs(Math.floor(i / 5) - Math.floor(position / 5)) +
        Math.abs((i % 5) - (position % 5)) <=
      1,
  );
}

// Four-neighbour, equal-cost grid; BFS uses the complete known map.
export function gridPath(walls, start = START, goal = GOAL) {
  const blocked = new Set(walls);
  if (blocked.has(start) || blocked.has(goal)) return [];
  const queue = [[start]];
  const seen = new Set([start]);
  for (let head = 0; head < queue.length; head++) {
    const path = queue[head],
      cell = path.at(-1);
    if (cell === goal) return path;
    const row = Math.floor(cell / GRID_SIZE),
      col = cell % GRID_SIZE;
    for (const [dr, dc] of [
      [-1, 0],
      [0, 1],
      [1, 0],
      [0, -1],
    ]) {
      const r = row + dr,
        c = col + dc,
        next = r * GRID_SIZE + c;
      if (
        r < 0 ||
        r >= GRID_SIZE ||
        c < 0 ||
        c >= GRID_SIZE ||
        blocked.has(next) ||
        seen.has(next)
      )
        continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return [];
}
