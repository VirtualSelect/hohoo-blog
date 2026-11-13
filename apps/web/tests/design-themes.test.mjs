import test from "node:test";
import assert from "node:assert/strict";
import {
  designThemes,
  designPreferenceKey,
  legacyThemePreferenceKey,
  resolveDesignPreference,
} from "../lib/design-themes.mjs";

test("the eight-design registry keeps the A–H order, supported modes and three-language descriptions", () => {
  assert.equal(designPreferenceKey, "huhohoo.design.v1");
  assert.equal(legacyThemePreferenceKey, "huhohoo.theme.v1");
  assert.deepEqual(
    designThemes.map(({ id, code, mode }) => ({ id, code, mode })),
    [
      { id: "space", code: "A", mode: "dark" },
      { id: "clear", code: "B", mode: "light" },
      { id: "classic", code: "C", mode: "light" },
      { id: "garden", code: "D", mode: "light" },
      { id: "photo", code: "E", mode: "light" },
      { id: "construct", code: "F", mode: "light" },
      { id: "map", code: "G", mode: "light" },
      { id: "chapters", code: "H", mode: "light" },
    ],
  );
  for (const theme of designThemes)
    for (const field of ["label", "shortLabel", "description"]) {
      assert.equal(theme[field].length, 3, `${theme.id}: ${field}`);
      assert.ok(
        theme[field].every((text) => typeof text === "string" && text.trim()),
        `${theme.id}: ${field} must be usable in each locale`,
      );
    }
});

test("an explicit design resolves to its full registered entry before any legacy or system preference", () => {
  for (const theme of designThemes)
    for (const legacyTheme of [null, "dark", "light", "invalid"])
      for (const systemDark of [false, true])
        assert.equal(
          resolveDesignPreference(theme.id, legacyTheme, systemDark),
          theme,
        );
});

test("retired preview IDs migrate to their replacements before legacy or system defaults", () => {
  for (const [retired, replacement] of [
    ["journal", "garden"],
    ["gallery", "photo"],
  ]) {
    assert.ok(!designThemes.some((theme) => theme.id === retired));
    for (const legacyTheme of [null, "dark", "light"])
      for (const systemDark of [false, true]) {
        const resolved = resolveDesignPreference(
          retired,
          legacyTheme,
          systemDark,
        );
        assert.equal(
          resolved,
          designThemes.find((theme) => theme.id === replacement),
        );
        assert.equal(resolved.mode, "light");
      }
  }
});

test("missing and invalid designs retain the legacy A/B choice", () => {
  for (const design of [
    undefined,
    null,
    "",
    "A",
    "B",
    "Dark",
    "toString",
    "__proto__",
    {},
  ])
    for (const systemDark of [false, true]) {
      assert.equal(
        resolveDesignPreference(design, "dark", systemDark).id,
        "space",
      );
      assert.equal(
        resolveDesignPreference(design, "light", systemDark).id,
        "clear",
      );
    }
});

test("without a valid saved design or legacy theme, the system determines a complete default", () => {
  for (const legacyTheme of [
    undefined,
    null,
    "",
    "DARK",
    "Light",
    "classic",
    {},
  ])
    for (const systemDark of [false, true]) {
      const theme = resolveDesignPreference(
        "not-a-design",
        legacyTheme,
        systemDark,
      );
      assert.equal(theme.id, systemDark ? "space" : "clear");
      assert.equal(theme.mode, systemDark ? "dark" : "light");
      assert.ok(designThemes.includes(theme));
    }
});
