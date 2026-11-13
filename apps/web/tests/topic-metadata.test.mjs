import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const topics = createRequire(import.meta.url)(
  "../../../data/topics.js",
).default;

for (const locale of ["en", "zh-TW"])
  test(locale + ": topic shells reuse localized category copy", () => {
    const data = JSON.parse(
      fs.readFileSync(
        new URL("../generated/" + locale + ".json", import.meta.url),
        "utf8",
      ),
    );
    for (const topic of topics.filter((item) => item.id !== "rag")) {
      const document = data.documents.find(
        (item) => item.route === "docs/" + topic.id,
      );
      assert(document.frontMatter.landing);
      assert.equal(
        document.metadata.title,
        locale === "en" ? topic.en : topic.titleTw,
      );
      assert.equal(
        document.metadata.description,
        locale === "en" ? topic.english : topic.descriptionTw,
      );
      assert.equal(document.frontMatter.title, document.metadata.title);
      assert.equal(
        document.metadata.permalink,
        "/" + locale + "/docs/" + topic.id,
      );
    }
    // An authored translation has priority over the shared shell fallback.
    const rag = data.documents.find((item) => item.route === "docs/rag");
    assert.equal(rag.sourceFallback, false);
  });
