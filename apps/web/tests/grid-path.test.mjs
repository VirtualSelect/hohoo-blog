import test from "node:test";
import assert from "node:assert/strict";
import {
  gridPath,
  START,
  GOAL,
  DEFAULT_WALLS,
  visibleCells,
} from "../lib/grid-path.mjs";

test("grid paths are shortest orthogonal paths that avoid obstacles", () => {
  for (const walls of [[], DEFAULT_WALLS, [0, 1, 2, 3, 8, 13, 18]]) {
    const path = gridPath(walls);
    assert.equal(path[0], START);
    assert.equal(path.at(-1), GOAL);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i];
      assert.equal(
        Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) +
          Math.abs((a % 5) - (b % 5)),
        1,
      );
      assert.ok(!walls.includes(b));
    }
  }
  assert.equal(gridPath([]).length - 1, 8);
});
test("blocked start exits give no route; arrival gives a zero-move path", () => {
  assert.deepEqual(gridPath([15, 21]), []);
  assert.deepEqual(gridPath([], GOAL), [GOAL]);
  assert.deepEqual(gridPath([GOAL]), []);
});

test("local vision does not know distant obstacles and replans when observed", () => {
  const walls = [10];
  let known = visibleCells(START);
  assert.deepEqual(known, [15, 20, 21]);
  const first = gridPath(walls.filter((cell) => known.includes(cell)));
  assert.ok(first.includes(10));
  const position = first[1];
  known = [...new Set([...known, ...visibleCells(position)])];
  assert.ok(known.includes(10));
  const next = gridPath(
    walls.filter((cell) => known.includes(cell)),
    position,
  );
  assert.ok(!next.includes(10));
  assert.ok(visibleCells(position).includes(next[1]));
});
