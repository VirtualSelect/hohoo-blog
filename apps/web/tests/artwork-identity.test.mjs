import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { designThemes } from "../lib/design-themes.mjs";
import { objectNotes } from "../components/theme-artwork-catalog.ts";
import { secretNotes } from "../components/encore-catalog.ts";
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

test("every selectable theme has localized artwork and distinct fallback poses", () => {
  const titles = new Set();
  const media = new URL("../../../static/media/", import.meta.url);
  for (const { id } of designThemes) {
    const { home, about } = objectNotes[id];
    const secret = secretNotes[id];
    for (const name of [home.name, about.name, secret.title]) {
      assert.equal(name.length, 3);
      assert.ok(name.every((translation) => translation.trim()));
      assert.ok(!titles.has(name[0]), name[0]);
      titles.add(name[0]);
    }
    for (const files of [
      ["home", "home-open"].map(
        (pose) => `theme-objects-v3/${id}-${pose}.webp`,
      ),
      ["about", "about-open"].map(
        (pose) => `theme-objects-v3/${id}-${pose}.webp`,
      ),
      ["closed", "half", "open"].map(
        (pose) => `theme-secrets/${id}-${pose}.webp`,
      ),
    ]) {
      const images = files.map((file) => readFileSync(new URL(file, media)));
      for (const [index, image] of images.entries()) {
        assert.equal(image.toString("ascii", 8, 12), "WEBP", files[index]);
        assert.ok(
          images.slice(0, index).every((other) => !image.equals(other)),
          files[index],
        );
      }
    }
  }
});
