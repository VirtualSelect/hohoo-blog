import test from "node:test";
import assert from "node:assert/strict";
import {
  COLS,
  SIZE,
  HISTORY_LIMIT,
  makePattern,
  evolve,
  neighbors,
  createGarden,
  gardenReducer,
  encodeSeed,
  decodeSeed,
  gardenSvg,
} from "../lib/emergence.ts";

test("known patterns: block stays still, blinker repeats in two, pulsar in three", () => {
  for (const [name, period] of [
    ["block", 1],
    ["blinker", 2],
    ["pulsar", 3],
  ]) {
    const seed = makePattern(name);
    let frame = seed;
    for (let i = 0; i < period; i++) frame = evolve(frame, "closed");
    assert.deepEqual(frame, seed);
    if (period > 1) assert.notDeepEqual(evolve(seed, "closed"), seed);
  }
});
test("glider travels one cell diagonally in four simultaneous updates", () => {
  const seed = makePattern("glider");
  let frame = seed;
  for (let i = 0; i < 4; i++) frame = evolve(frame, "closed");
  assert.equal(
    frame.reduce((a, b) => a + b),
    5,
  );
  const expected = Array(SIZE).fill(0);
  seed.forEach((alive, i) => {
    if (alive) expected[i + COLS + 1] = 1;
  });
  assert.deepEqual(frame, expected);
});
test("finite and wrap boundaries differ at the corner; updates do not mutate input", () => {
  const seed = Array(SIZE).fill(0);
  for (const i of [COLS - 1, SIZE - COLS, SIZE - 1]) seed[i] = 1;
  const before = [...seed];
  assert.equal(neighbors(seed, 0, "closed"), 0);
  assert.equal(neighbors(seed, 0, "wrap"), 3);
  assert.equal(evolve(seed, "closed")[0], 0);
  assert.equal(evolve(seed, "wrap")[0], 1);
  assert.deepEqual(seed, before);
});
test("bounded rewind branches from the selected frame, and reset restores the original seed", () => {
  let state = createGarden(makePattern("blinker"));
  const seed = [...state.seed];
  for (let i = 0; i < 150; i++) state = gardenReducer(state, { type: "step" });
  assert.equal(state.frames.length, HISTORY_LIMIT);
  assert.equal(state.offset + state.cursor, 150);
  state = gardenReducer(state, { type: "seek", cursor: 4 });
  const past = state.frames[4];
  state = gardenReducer(state, { type: "step" });
  assert.equal(state.frames.length, 6);
  assert.deepEqual(state.frames[5], evolve(past, "closed"));
  state = gardenReducer(state, { type: "reset" });
  assert.equal(state.offset + state.cursor, 0);
  assert.deepEqual(state.frames, [seed]);
});
test("editing or changing boundaries starts a new reproducible seed", () => {
  let state = createGarden(makePattern("garden"));
  state = gardenReducer(state, { type: "step" });
  const old = [...state.frames[1]];
  state = gardenReducer(state, { type: "toggle", index: 0 });
  assert.equal(state.frames.length, 1);
  assert.equal(state.seed[0], 1 - old[0]);
  assert.deepEqual(state.seed.slice(1), old.slice(1));
  state = gardenReducer(state, { type: "boundary", boundary: "wrap" });
  assert.equal(state.boundary, "wrap");
  assert.deepEqual(state.frames[0], state.seed);
  assert.equal(gardenReducer(state, { type: "toggle", index: SIZE }), state);
});
test("seed round trip is exact; malformed and oversized shared inputs are rejected", () => {
  for (const boundary of ["closed", "wrap"]) {
    const seed = makePattern("garden");
    assert.deepEqual(decodeSeed(encodeSeed(seed, boundary)), {
      seed,
      boundary,
    });
  }
  for (const input of [
    "",
    "1.c.0",
    "2.c." + "0".repeat(96),
    "1.x." + "0".repeat(96),
    "1.c." + "f".repeat(97),
    "1.c." + "z".repeat(96),
    "<script>alert(1)</script>",
  ])
    assert.equal(decodeSeed(input), null);
});
test("export preserves the exact frame as metadata without executable content", () => {
  const seed = makePattern("glider");
  const svg = gardenSvg(seed, "wrap", 4);
  assert(svg.includes(encodeSeed(seed, "wrap")));
  assert(svg.includes("generation 4"));
  assert.equal((svg.match(/fill="#467b76"/g) || []).length, 5);
  assert(!/script|onload=|foreignObject|https?:\/\/[^w]/i.test(svg));
});
