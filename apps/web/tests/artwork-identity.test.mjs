import test from "node:test";
import assert from "node:assert/strict";
import {
  defaults,
  designs,
  kinds,
  artworkNames,
} from "../components/theme-artwork-config.ts";

test("each theme has its own fixed home sculpture rather than a recolored duplicate", () => {
  assert.equal(designs.length, 8);
  assert.equal(new Set(Object.values(defaults)).size, designs.length);
  for (const design of designs) {
    assert.ok(kinds.includes(defaults[design]));
    assert.equal(artworkNames[defaults[design]].length, 3);
    assert.ok(
      artworkNames[defaults[design]].every((name) => name.trim().length > 0),
    );
  }
});
