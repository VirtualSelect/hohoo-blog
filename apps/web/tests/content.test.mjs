import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const load = (l) =>
  JSON.parse(
    fs.readFileSync(
      new URL("../generated/" + l + ".json", import.meta.url),
      "utf8",
    ),
  );
for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(
    locale + ": real content routes and learning metadata remain linked",
    () => {
      const data = load(locale),
        prefix = locale === "zh-CN" ? "" : "/" + locale;
      assert.equal(new Set(data.routes).size, data.routes.length);
      for (const e of data.globalData["content-index"].entries)
        assert(
          data.routes.includes(e.href.slice(prefix.length + 1).split("#")[0]),
          e.href,
        );
      const doc = data.documents.find(
        (d) => d.route === "docs/ai-apps/java-first-llm",
      );
      assert(doc.html.includes("845fa9f18475b77e761806d14565612680ba6fe1"));
      assert(doc.html.includes("<pre>"));
      assert(doc.headings.length > 5);
      for (const h of doc.headings)
        assert(doc.html.includes('id="' + h.id + '"'));
      assert(!doc.html.includes("<script"));
      assert(
        !data.routes.some(
          (r) => r.includes("CONTENT-MODEL") || r.includes("NODE-RUNTIME"),
        ),
      );
      assert.equal(
        data.globalData["learning-index"].entries[0].stepId,
        "first-call",
      );
    },
  );
  test(locale + ": Radar stays external and RSS remains available", () => {
    const data = load(locale);
    assert(
      data.items.every(
        (i) => i.url?.startsWith("https://") && i.sourceName && i.publishedAt,
      ),
    );
    assert(
      !data.globalData["content-index"].activity.some(
        (e) => e.type === "radar-item",
      ),
    );
    for (const name of ["news", "blog", "radar"])
      assert(
        fs.existsSync(
          new URL(
            "../public/" +
              (locale === "zh-CN" ? "" : locale + "/") +
              name +
              "/rss.xml",
            import.meta.url,
          ),
        ),
      );
  });
}
