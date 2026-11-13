import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { stripMdxImports } from "../lib/markdown-source.mjs";
test("MDX imports are removed without deleting JavaScript or Java imports in fenced code", () => {
  const source = [
    'import TopicLanding from "@site/src/components/TopicLanding";',
    "",
    "```js",
    'import { searchTerms } from "./section-search.mjs";',
    "```",
    "",
    "~~~java",
    "import java.net.Socket;",
    "~~~",
    "",
    'import "./component.css";',
  ].join("\n");
  const rendered = stripMdxImports(source);
  assert(!rendered.includes("import TopicLanding"));
  assert(!rendered.includes('import "./component.css"'));
  assert(rendered.includes("import { searchTerms }"));
  assert(rendered.includes("import java.net.Socket;"));
});
test("short or different fences inside a longer code fence cannot expose import lines", () => {
  const source = [
    "````md",
    "```js",
    'import value from "./inside";',
    "```",
    "````",
    'import View from "./outside";',
  ].join("\n");
  const text = stripMdxImports(source);
  assert(text.includes('import value from "./inside";'));
  assert(!text.includes("import View"));
});
for (const locale of ["zh-CN", "en", "zh-TW"])
  test(locale + ": rendered tutorial retains its executable import", () => {
    const data = JSON.parse(
      fs.readFileSync(
        new URL("../generated/" + locale + ".json", import.meta.url),
        "utf8",
      ),
    );
    const doc = data.documents.find(
      (d) => d.route === "docs/rag/blog-passage-search",
    );
    const code = doc.html
      .match(/<pre><code[^>]*>[\s\S]*?<\/code><\/pre>/)?.[0]
      .replace(/<[^>]*>/g, "");
    assert(code.includes("import"));
    assert(code.includes("./apps/web/lib/section-search.mjs"));
  });
