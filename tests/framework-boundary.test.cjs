const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
test("active code and packages do not require the retired framework", () => {
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        ["node_modules", ".next", "generated", "public"].includes(e.name)
          ? []
          : e.isDirectory()
            ? walk(path.join(dir, e.name))
            : [path.join(dir, e.name)],
      );
  for (const dir of ["src", "apps/web", "lib/content"]) {
    for (const file of walk(path.join(root, dir)).filter((f) =>
      /\.(js|jsx|ts|tsx|mjs|cjs|css)$/.test(f),
    )) {
      assert.doesNotMatch(
        fs.readFileSync(file, "utf8"),
        /@docusaurus\/|@theme(?:-original)?\/|@generated\/|--ifm-/,
        file,
      );
    }
  }
  for (const dir of ["", "apps/web"]) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, dir, "package.json")),
    );
    assert.ok(
      !Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((k) =>
        k.startsWith("@docusaurus/"),
      ),
    );
    assert.ok(!Object.values(pkg.scripts).some((v) => /docusaurus/.test(v)));
  }
});
