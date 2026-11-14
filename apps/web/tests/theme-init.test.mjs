import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { themeScript } from "../lib/theme-init.mjs";
import {
  roamingPreferenceKey,
  readRoamingState,
  recordDesignVisit,
} from "../lib/theme-roaming.mjs";

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
  roaming = null,
  systemDark = false,
  stored = new Map(
    [
      [designKey, design],
      [legacyKey, legacyTheme],
      [roamingPreferenceKey, roaming],
    ].filter(([, value]) => value !== null),
  ),
  path = "/",
  storage = "available",
  initialDesign = "clear",
  initialTheme = "light",
  allowWrites = false,
  now = new Date(2026, 10, 14, 12).getTime(),
  script = themeScript,
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
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [now]));
      }
    },
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
      setItem(key, value) {
        writes.push(["setItem", key, value]);
        if (
          !allowWrites ||
          (storage === "design-write-error" && key === designKey) ||
          (storage === "roaming-write-error" && key === roamingPreferenceKey)
        )
          throw new Error("Preference write unavailable");
        stored.set(key, value);
      },
      removeItem(...args) {
        writes.push(["removeItem", ...args]);
        throw new Error("Initialization must not erase browser preferences");
      },
    };
  }
  // No DOM-ready event, React hydration or timer is provided: both attributes
  // must be set immediately when the real head script finishes.
  vm.runInNewContext(script, scope, { timeout: 100 });
  if (!allowWrites)
    assert.deepEqual(
      writes,
      [],
      "Default initialization must not mutate storage",
    );
  return { root, reads, writes, stored, location };
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
        result.reads.every((key) =>
          [designKey, legacyKey, roamingPreferenceKey].includes(key),
        ),
      );
      assert.equal(result.stored.get(designKey), design);
      assert.equal(result.stored.get(legacyKey), legacyTheme);
    }
});

test("the real bundled head script remains self-contained in development and production", async () => {
  const require = createRequire(import.meta.url);
  const { webpack } = require("next/dist/compiled/webpack/webpack.js");
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "hohoo-theme-bootstrap-"),
  );
  try {
    for (const mode of ["development", "production"]) {
      const filename = mode + ".cjs";
      const compiler = webpack({
        mode,
        target: "node",
        devtool: false,
        // Exercise module rewriting and production concatenation independently
        // of the Next build's custom minifier, which is checked by npm run build.
        optimization: { minimize: false, minimizer: [] },
        entry: fileURLToPath(new URL("../lib/theme-init.mjs", import.meta.url)),
        output: { path: directory, filename, library: { type: "commonjs2" } },
      });
      try {
        await new Promise((resolve, reject) => {
          compiler.run((error, stats) => {
            if (error) reject(error);
            else if (stats.hasErrors())
              reject(new Error(stats.toString({ all: false, errors: true })));
            else resolve();
          });
        });
      } finally {
        await new Promise((resolve, reject) =>
          compiler.close((error) => (error ? reject(error) : resolve())),
        );
      }
      const output = { exports: {} };
      vm.runInNewContext(
        await fs.readFile(path.join(directory, filename), "utf8"),
        { module: output },
        { timeout: 1000 },
      );
      const script = output.exports.themeScript;
      assert.equal(typeof script, "string");
      assert.equal(
        initialize({ script, design: "photo" }).root.dataset.design,
        "photo",
        mode,
      );
      const daily = initialize({
        script,
        design: "garden",
        roaming: dailyPreference(),
        allowWrites: true,
      });
      assert.notEqual(daily.root.dataset.design, "garden", mode);
      assert.equal(
        readRoamingState(daily.stored.get(roamingPreferenceKey)).day,
        "2026-11-14",
        mode,
      );
    }
  } finally {
    // Only remove this test's newly created directory under the OS temp root.
    assert.equal(
      path.dirname(path.resolve(directory)),
      path.resolve(os.tmpdir()),
    );
    assert.ok(path.basename(directory).startsWith("hohoo-theme-bootstrap-"));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

function dailyPreference(day = "2026-11-13", id = "garden") {
  return JSON.stringify(
    recordDesignVisit(readRoamingState(null), id, id, { daily: true, day }),
  );
}

test("opted-in daily scenery changes once before paint and survives new documents", () => {
  const result = initialize({
    design: "garden",
    roaming: dailyPreference(),
    allowWrites: true,
  });
  const next = result.root.dataset.design;
  const saved = readRoamingState(result.stored.get(roamingPreferenceKey));
  assert.notEqual(next, "garden");
  assert.equal(saved.dailyId, next);
  assert.equal(saved.day, "2026-11-14");
  assert.equal(saved.previousId, "garden");
  assert.equal(result.stored.get(designKey), next);
  assert.deepEqual(
    result.writes.map(([, key]) => key),
    [designKey, roamingPreferenceKey],
  );
  const sameDay = initialize({
    stored: result.stored,
    path: "/articles?q=attention#results",
  });
  assert.equal(sameDay.root.dataset.design, next);
  assert.equal(
    sameDay.location.href,
    "https://huhohoo.com/articles?q=attention#results",
  );
  assert.deepEqual(sameDay.writes, []);
  const tomorrow = initialize({
    stored: result.stored,
    allowWrites: true,
    now: new Date(2026, 10, 15, 0, 1).getTime(),
  });
  assert.notEqual(tomorrow.root.dataset.design, next);
  assert.notEqual(tomorrow.root.dataset.design, "garden");
});

test("concurrent documents starting from the same prior day choose the same next scenery", () => {
  const initial = {
    design: "garden",
    roaming: dailyPreference(),
    allowWrites: true,
  };
  const first = initialize(initial);
  const second = initialize(initial);
  assert.equal(first.root.dataset.design, second.root.dataset.design);
  assert.equal(
    first.stored.get(roamingPreferenceKey),
    second.stored.get(roamingPreferenceKey),
  );
});

test("an explicit selection wins over an older daily record even on a new day", () => {
  const result = initialize({
    design: "photo",
    roaming: dailyPreference(),
    allowWrites: true,
  });
  assert.equal(result.root.dataset.design, "photo");
  assert.equal(result.stored.get(designKey), "photo");
  assert.equal(
    readRoamingState(result.stored.get(roamingPreferenceKey)).daily,
    false,
  );
  assert.deepEqual(
    result.writes.map(([, key]) => key),
    [roamingPreferenceKey],
  );
});

test("a failed daily theme write retains the existing view and does not advance its record", () => {
  const before = dailyPreference();
  const result = initialize({
    design: "garden",
    roaming: before,
    storage: "design-write-error",
    allowWrites: true,
  });
  assert.equal(result.root.dataset.design, "garden");
  assert.equal(result.stored.get(designKey), "garden");
  assert.equal(result.stored.get(roamingPreferenceKey), before);
  assert.deepEqual(
    result.writes.map(([, key]) => key),
    [designKey],
  );
});

test("a partial daily write cannot roll back the saved view on a subsequent visit", () => {
  const result = initialize({
    design: "garden",
    roaming: dailyPreference(),
    storage: "roaming-write-error",
    allowWrites: true,
  });
  const next = result.root.dataset.design;
  assert.notEqual(next, "garden");
  assert.equal(result.stored.get(designKey), next);
  assert.equal(
    readRoamingState(result.stored.get(roamingPreferenceKey)).dailyId,
    "garden",
  );
  const reload = initialize({ stored: result.stored, allowWrites: true });
  assert.equal(reload.root.dataset.design, next);
  assert.equal(
    readRoamingState(result.stored.get(roamingPreferenceKey)).daily,
    false,
  );
});

test("malformed daily data cannot enable rotation or overwrite saved preferences", () => {
  for (const roaming of [
    "{",
    '{"daily":true}',
    '{"version":2,"daily":true}',
    JSON.stringify({
      version: 1,
      daily: true,
      day: "2026-02-30",
      dailyId: "garden",
    }),
    JSON.stringify({
      version: 1,
      daily: "true",
      day: "2026-11-13",
      dailyId: "garden",
    }),
    JSON.stringify({
      version: 1,
      daily: true,
      day: "2026-11-13",
      dailyId: "unknown",
    }),
  ]) {
    const result = initialize({ design: "garden", roaming });
    assert.equal(result.root.dataset.design, "garden");
    assert.deepEqual(result.writes, []);
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
