import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { themeScript } from "../lib/theme-init.mjs";

const designKey = "huhohoo.design.v1";
const legacyKey = "huhohoo.theme.v1";
const designs = [
  ["space", "dark"],
  ["clear", "light"],
  ["classic", "light"],
  ["garden", "light"],
  ["photo", "light"],
  ["construct", "light"],
  ["map", "light"],
  ["chapters", "light"],
];

function initialize({
  design = null,
  legacyTheme = null,
  systemDark = false,
  stored = new Map(
    [
      [designKey, design],
      [legacyKey, legacyTheme],
    ].filter(([, value]) => value !== null),
  ),
  path = "/",
  storage = "available",
  initialDesign = "clear",
  initialTheme = "light",
} = {}) {
  const reads = [];
  const writes = [];
  const root = {
    dataset: {
      design: initialDesign,
      theme: initialTheme,
      hasHydrated: "false",
    },
  };
  const location = { href: `https://huhohoo.com${path}` };
  const scope = {
    document: { documentElement: root },
    location,
    matchMedia(query) {
      assert.equal(query, "(prefers-color-scheme: dark)");
      return { matches: systemDark };
    },
  };
  if (storage === "blocked") {
    Object.defineProperty(scope, "localStorage", {
      get() {
        throw new Error("Storage access blocked");
      },
    });
  } else if (storage !== "missing") {
    scope.localStorage = {
      getItem(key) {
        reads.push(key);
        if (
          storage === "read-error" ||
          (storage === "legacy-read-error" && key === legacyKey)
        )
          throw new Error("Storage read failed");
        return stored.get(key) ?? null;
      },
      setItem(...args) {
        writes.push(["setItem", ...args]);
        throw new Error("Initialization must not write browser preferences");
      },
      removeItem(...args) {
        writes.push(["removeItem", ...args]);
        throw new Error("Initialization must not erase browser preferences");
      },
    };
  }
  // No DOM-ready event, React hydration or timer is provided: both attributes
  // must be set immediately when the real head script finishes.
  vm.runInNewContext(themeScript, scope, { timeout: 100 });
  assert.deepEqual(writes, [], "Head initialization must not mutate storage");
  return { root, reads, stored, location };
}

test("all eight saved designs set both attributes before paint despite conflicting legacy preferences", () => {
  for (const [design, mode] of designs)
    for (const legacyTheme of ["dark", "light"]) {
      const result = initialize({
        design,
        legacyTheme,
        systemDark: mode === "light",
      });
      assert.deepEqual(result.root.dataset, {
        design,
        theme: mode,
        hasHydrated: "false",
      });
      assert.ok(result.reads.includes(designKey));
      assert.ok(
        result.reads.every((key) => [designKey, legacyKey].includes(key)),
      );
      assert.equal(result.stored.get(designKey), design);
      assert.equal(result.stored.get(legacyKey), legacyTheme);
    }
});

test("retired preview IDs resolve to the adopted designs before paint without mutating storage", () => {
  for (const [retired, replacement] of [
    ["journal", "garden"],
    ["gallery", "photo"],
  ])
    for (const legacyTheme of ["dark", "light"])
      for (const systemDark of [false, true]) {
        const result = initialize({ design: retired, legacyTheme, systemDark });
        assert.deepEqual(result.root.dataset, {
          design: replacement,
          theme: "light",
          hasHydrated: "false",
        });
        assert.equal(result.stored.get(designKey), retired);
        assert.equal(result.stored.get(legacyKey), legacyTheme);
      }
});

test("missing or invalid design preferences retain legacy dark and light choices", () => {
  for (const design of [null, "", "A", "C", "Dark", "unknown", "{}"])
    for (const legacyTheme of ["dark", "light"]) {
      const result = initialize({
        design,
        legacyTheme,
        systemDark: legacyTheme === "light",
      });
      assert.equal(
        result.root.dataset.design,
        legacyTheme === "dark" ? "space" : "clear",
      );
      assert.equal(result.root.dataset.theme, legacyTheme);
      assert.equal(result.stored.get(designKey) ?? null, design);
    }
});

test("absent or invalid new and legacy values fall back to the system without saving defaults", () => {
  for (const design of [null, "", "system", "A", "__proto__"])
    for (const legacyTheme of [null, "", "Dark", "LIGHT", "classic"])
      for (const systemDark of [false, true]) {
        const result = initialize({ design, legacyTheme, systemDark });
        assert.equal(
          result.root.dataset.design,
          systemDark ? "space" : "clear",
        );
        assert.equal(result.root.dataset.theme, systemDark ? "dark" : "light");
        assert.equal(result.stored.get(designKey) ?? null, design);
        assert.equal(result.stored.get(legacyKey) ?? null, legacyTheme);
      }
});

test("unavailable storage still selects a complete readable design before hydration", () => {
  for (const storage of ["blocked", "read-error", "missing"])
    for (const systemDark of [false, true]) {
      const result = initialize({ storage, systemDark });
      assert.deepEqual(result.root.dataset, {
        design: systemDark ? "space" : "clear",
        theme: systemDark ? "dark" : "light",
        hasHydrated: "false",
      });
    }
});

test("failure to read the legacy key does not discard a valid new design", () => {
  const result = initialize({
    design: "map",
    legacyTheme: "dark",
    storage: "legacy-read-error",
    systemDark: true,
  });
  assert.equal(result.root.dataset.design, "map");
  assert.equal(result.root.dataset.theme, "light");
});

test("reloads and new route documents restore every design without changing reading data or URLs", () => {
  for (const [design, mode] of designs) {
    const stored = new Map([
      [designKey, design],
      [legacyKey, "dark"],
      ["huhohoo.learning.v1", '{"saved":["first-call"]}'],
      ["huhohoo.reading.v1", '{"items":{"doc:example":{"status":"read"}}}'],
    ]);
    const originalData = [...stored];
    for (const path of [
      "/?track=rag#research-routes",
      "/articles?q=cache&view=list",
      "/en/docs/llm/kv-cache#memory",
      "/zh-TW/reading?status=reading",
      "/a-route-that-does-not-exist",
    ]) {
      const result = initialize({ stored, path });
      assert.equal(result.root.dataset.design, design, path);
      assert.equal(result.root.dataset.theme, mode, path);
      assert.equal(result.location.href, `https://huhohoo.com${path}`);
      assert.deepEqual([...stored], originalData);
    }
  }
});

test("later documents read the latest shared design and legacy values rather than a cached selection", () => {
  const stored = new Map([
    [designKey, "classic"],
    [legacyKey, "dark"],
  ]);
  assert.equal(initialize({ stored }).root.dataset.design, "classic");
  stored.set(designKey, "photo");
  assert.equal(
    initialize({ stored, path: "/learning" }).root.dataset.design,
    "photo",
  );
  stored.set(legacyKey, "light");
  assert.equal(
    initialize({ stored, path: "/reading" }).root.dataset.design,
    "photo",
  );
  stored.delete(designKey);
  assert.equal(
    initialize({ stored, path: "/radar", systemDark: true }).root.dataset
      .design,
    "clear",
  );
  stored.delete(legacyKey);
  assert.equal(
    initialize({ stored, path: "/articles", systemDark: true }).root.dataset
      .design,
    "space",
  );
});
