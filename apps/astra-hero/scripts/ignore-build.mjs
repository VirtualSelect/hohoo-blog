import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const sharedFiles = new Set([
  "package.json",
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".node-version",
  ".nvmrc",
  ".npmrc",
  "vercel.json",
]);
export function affectsAstra(files) {
  return files.some(
    (file) =>
      file.startsWith("apps/astra-hero/") ||
      file.startsWith("src/components/AstraParticleHero/") ||
      sharedFiles.has(file),
  );
}
export function ignoredBuildExitCode(env = process.env, git = execFileSync) {
  // First deploys, shallow history and same-commit rebuilds continue safely.
  if (env.ASTRA_FORCE_BUILD === "1") return 1;
  const previous = env.VERCEL_GIT_PREVIOUS_SHA;
  const current = env.VERCEL_GIT_COMMIT_SHA;
  if (
    ![previous, current].every((sha) => /^[a-f0-9]{40}$/i.test(sha || "")) ||
    previous === current
  )
    return 1;
  try {
    const files = git(
      "git",
      ["diff", "--name-only", "--no-renames", "-z", previous, current, "--"],
      {
        cwd: fileURLToPath(new URL("../../../", import.meta.url)),
        encoding: "utf8",
        timeout: 10000,
      },
    )
      .split("\0")
      .filter(Boolean);
    return affectsAstra(files) ? 1 : 0;
  } catch {
    return 1;
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const code = ignoredBuildExitCode();
  console.log(
    code === 0
      ? "Skipping Astra: changes do not affect the particle app or its shared sources."
      : "Building Astra: relevant changes, explicit rebuild, or history unavailable.",
  );
  process.exitCode = code;
}
