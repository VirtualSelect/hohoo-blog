import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { inspectNews, formatNewsStatus } from "./status-lib.mjs";

const args = process.argv.slice(2);
let site = "https://huhohoo.com";
let json = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") json = true;
  else if (args[i] === "--preview" && args[i + 1]) site = args[++i];
  else
    throw Error(
      "Usage: node scripts/news/status.mjs [--json] [--preview http://localhost:PORT]",
    );
}
const read = (file) =>
  JSON.parse(
    fs.readFileSync(
      fileURLToPath(new URL("../../" + file, import.meta.url)),
      "utf8",
    ),
  );
const report = await inspectNews({
  records: read("data/news/items.json"),
  config: read("config/news-sources.json"),
  site,
});
console.log(json ? JSON.stringify(report, null, 2) : formatNewsStatus(report));
// A missing snapshot on an older release is expected; RSS-only remains explicit.
if (!report.remote.value || !report.rss.value || !report.workflow.value)
  process.exitCode = 2;
