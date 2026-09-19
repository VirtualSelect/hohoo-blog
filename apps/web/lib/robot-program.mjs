import { GRID_SIZE, START, GOAL } from "./grid-path.mjs";
export const initialRobot = () => ({
  position: START,
  direction: 0,
  cursor: 0,
  blocked: false,
});
export function stepRobot(state, program, walls) {
  if (
    state.blocked ||
    state.position === GOAL ||
    state.cursor >= program.length
  )
    return state;
  const command = program[state.cursor];
  if (command === "left" || command === "right")
    return {
      ...state,
      direction: (state.direction + (command === "left" ? 3 : 1)) % 4,
      cursor: state.cursor + 1,
    };
  if (command !== "forward") return { ...state, blocked: true };
  const [dr, dc] = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ][state.direction];
  const row = Math.floor(state.position / GRID_SIZE) + dr,
    col = (state.position % GRID_SIZE) + dc;
  const position = row * GRID_SIZE + col;
  if (
    row < 0 ||
    row >= GRID_SIZE ||
    col < 0 ||
    col >= GRID_SIZE ||
    walls.includes(position)
  )
    return { ...state, blocked: true };
  return { ...state, position, cursor: state.cursor + 1 };
}
