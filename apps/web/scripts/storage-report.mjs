import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(app, "../..");
function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    return entry.isDirectory()
      ? walk(name)
      : [
          {
            path: path.relative(root, name).replaceAll("\\", "/"),
            bytes: fs.statSync(name).size,
          },
        ];
  });
}
const sum = (files) => files.reduce((n, file) => n + file.bytes, 0);
const server = walk(path.join(app, ".next/server"));
if (!server.length) throw new Error("Build apps/web before measuring storage.");
const assets = walk(path.join(app, ".next/static"));
const publicFiles = walk(path.join(app, "public"));
const prerender = server.filter((file) =>
  /\.(html|rsc|body|meta)$/.test(file.path),
);
const traces = walk(path.join(app, ".next"))
  .filter((file) => file.path.endsWith(".nft.json"))
  .map((trace) => {
    const tracePath = path.join(root, trace.path);
    const names = JSON.parse(fs.readFileSync(tracePath, "utf8")).files;
    // NFT paths can contain different relative spellings of the same file.
    const unique = [
      ...new Set(
        names.map((name) => path.resolve(path.dirname(tracePath), name)),
      ),
    ];
    const missing = unique.filter((name) => !fs.existsSync(name));
    const files = unique
      .filter((name) => fs.existsSync(name))
      .map((name) => ({
        path: path.relative(root, name).replaceAll("\\", "/"),
        bytes: fs.statSync(name).size,
      }));
    return {
      trace: trace.path,
      files: files.length,
      bytes: sum(files),
      missing,
      largest: files.sort((a, b) => b.bytes - a.bytes).slice(0, 10),
    };
  });
const report = {
  measuredAt: new Date().toISOString(),
  scope:
    "Local uncompressed output, not Vercel billed storage. Traces overlap; never add trace sizes together. Cache and node_modules directory sizes are not deployment sizes.",
  prerenderBytes: sum(prerender),
  prerenderFiles: prerender.length,
  htmlBytes: sum(prerender.filter((file) => file.path.endsWith(".html"))),
  rscBytes: sum(prerender.filter((file) => file.path.endsWith(".rsc"))),
  clientAssetsBytes: sum(assets),
  publicBytes: sum(publicFiles),
  staticOutputEstimateBytes: sum([...prerender, ...assets, ...publicFiles]),
  thresholds: [1, 5, 10].map((mb) => ({
    overMB: mb,
    files: [...prerender, ...assets, ...publicFiles].filter(
      (file) => file.bytes > mb * 1e6,
    ).length,
  })),
  largest: [...prerender, ...assets, ...publicFiles]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 30),
  traces: traces.sort((a, b) => b.bytes - a.bytes),
};
console.log(JSON.stringify(report, null, 2));
const limit = process.env.STORAGE_STATIC_BUDGET_MB;
if (limit !== undefined) {
  if (!Number.isFinite(Number(limit)) || Number(limit) <= 0)
    throw new Error("STORAGE_STATIC_BUDGET_MB must be positive.");
  if (report.staticOutputEstimateBytes > Number(limit) * 1e6) {
    console.error(`Static output exceeds the ${limit} MB review budget.`);
    process.exitCode = 1;
  }
}
