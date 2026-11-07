import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultApp = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const locales = ["zh-CN", "zh-TW", "en"];
const generatedName = /^(zh-CN|zh-TW|en)-[a-f0-9]{16}\.json$/;

// Only production builds prune, after all locale manifests have been generated.
// Development keeps prior snapshots so an open preview can finish lazy loading.
export function pruneGeneratedAssets(app = defaultApp) {
  const publicRoot = path.resolve(app, "public");
  if (fs.lstatSync(publicRoot).isSymbolicLink()) {
    throw new Error("Refusing to prune a linked public directory.");
  }
  const realPublic = fs.realpathSync(publicRoot);
  const directories = new Map();
  for (const name of ["search", "radar-data"]) {
    const directory = path.join(publicRoot, name);
    if (
      fs.lstatSync(directory).isSymbolicLink() ||
      fs.realpathSync(directory) !== path.join(realPublic, name)
    ) {
      throw new Error(`Refusing to prune a linked ${name} directory.`);
    }
    directories.set(name, directory);
  }
  const keep = new Set();
  // Validate every manifest and referenced file before deleting anything.
  for (const locale of locales) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(app, "generated", `${locale}.json`), "utf8"),
    );
    if (!Array.isArray(manifest.radarArchive?.chunks)) {
      throw new Error(`Missing radar manifest for ${locale}.`);
    }
    const references = [
      ["search", manifest.searchUrl],
      ...manifest.radarArchive.chunks.map((url) => ["radar-data", url]),
    ];
    for (const [directory, url] of references) {
      const pattern = new RegExp(
        `^/${directory}/${locale}-[a-f0-9]{16}\\.json$`,
      );
      if (typeof url !== "string" || !pattern.test(url)) {
        throw new Error(`Invalid generated asset reference for ${locale}.`);
      }
      const file = path.join(publicRoot, url.slice(1));
      if (!fs.lstatSync(file).isFile()) {
        throw new Error(`Current asset must be a regular file: ${url}`);
      }
      keep.add(url);
    }
  }
  const obsolete = [];
  for (const [name, directory] of directories) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        !entry.isFile() ||
        !generatedName.test(entry.name) ||
        keep.has(`/${name}/${entry.name}`)
      )
        continue;
      const file = path.resolve(directory, entry.name);
      if (path.dirname(file) !== directory)
        throw new Error("Asset path escaped its output directory.");
      obsolete.push({ file, bytes: fs.statSync(file).size });
    }
  }
  for (const entry of obsolete) fs.unlinkSync(entry.file);
  return {
    files: obsolete.length,
    bytes: obsolete.reduce((n, entry) => n + entry.bytes, 0),
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = pruneGeneratedAssets();
  console.log(
    `Removed ${result.files} obsolete generated indexes (${result.bytes} bytes).`,
  );
}
