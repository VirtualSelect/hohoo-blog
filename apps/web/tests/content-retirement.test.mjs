import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import redirects from "../../../data/content-redirects.json" with { type: "json" };
import config from "../next.config.mjs";

test("retired pages redirect in every language without remaining in discovery feeds", async () => {
  const rules = await config.redirects();
  for (const locale of ["zh-CN", "en", "zh-TW"]) {
    const prefix = locale === "zh-CN" ? "" : `/${locale}`;
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const rss = fs.readFileSync(
      new URL(`../public${prefix}/blog/rss.xml`, import.meta.url),
      "utf8",
    );
    for (const [from, to] of Object.entries(redirects)) {
      assert(!data.routes.includes(from.slice(1)), from);
      assert(
        !data.search.some(
          (entry) => entry.href?.split(/[?#]/)[0] === prefix + from,
        ),
        from,
      );
      assert(!rss.includes(prefix + from), from);
      assert(
        rules.some(
          (r) =>
            r.source === prefix + from &&
            r.destination === prefix + to &&
            r.permanent,
        ),
      );
      assert(data.routes.includes(to.split(/[?#]/)[0].slice(1)), to);
    }
    for (const id of ["context", "decision-desk"]) {
      assert(!data.search.some((entry) => entry.id === "workshop:" + id));
    }
  }
});
