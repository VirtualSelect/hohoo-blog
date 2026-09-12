import fs from "node:fs";
const base = process.env.PREVIEW_URL || "http://localhost:4181";
const errors = [];
let count = 0;
for (const locale of ["zh-CN", "zh-TW", "en"]) {
  const data = JSON.parse(
    fs.readFileSync(
      new URL("../generated/" + locale + ".json", import.meta.url),
      "utf8",
    ),
  );
  const prefix = locale === "zh-CN" ? "" : "/" + locale;
  for (const route of data.routes) {
    const url = base + prefix + "/" + route;
    const response = await fetch(url),
      html = await response.text();
    count++;
    if (
      response.status !== 200 ||
      !html.includes("<h1") ||
      html.includes("Application error:") ||
      html.includes('"digest":')
    )
      errors.push({ url, status: response.status });
    if (!html.includes('lang="' + locale + '"'))
      errors.push({ url, error: "html language" });
  }
  for (const [from, to] of [
    ["aboutMe", "about"],
    ["news", "radar"],
    ["lab", "labs"],
    ["blog/a%20new%20milestone", "blog/a-new-milestone"],
  ]) {
    const r = await fetch(base + prefix + "/" + from, { redirect: "manual" });
    if (r.status !== 308 || r.headers.get("location") !== prefix + "/" + to)
      errors.push({
        from,
        status: r.status,
        location: r.headers.get("location"),
      });
  }
  for (const route of ["blog/rss.xml", "news/rss.xml", "radar/rss.xml"]) {
    const r = await fetch(base + prefix + "/" + route);
    if (r.status !== 200 || !(await r.text()).startsWith("<?xml"))
      errors.push({ route, locale, error: "RSS" });
  }
}
const missing = await fetch(base + "/a-route-that-does-not-exist");
if (missing.status !== 404) errors.push({ error: "Missing 404" });
console.log(JSON.stringify({ pages: count, errors }, null, 2));
if (errors.length) process.exitCode = 1;
