import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

const transientFailure =
  /Internal Server Error|(?:HTTP|error:)\s*(?:code\s*=\s*)?(?:408|429|500|502|503|504)\b|remote end hung up unexpectedly|connection (?:reset|timed out)|could not resolve host|operation timed out/i;

// Retry only the already-validated commit. Never fetch, rebase or force-push:
// changing the tree here would invalidate the checks preceding this step.
export async function pushValidatedCommit({
  branch,
  cwd = process.cwd(),
  runGit = (args) =>
    spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 60_000,
      env: { ...process.env, LC_ALL: "C" },
    }),
  wait = setTimeout,
  log = console.log,
} = {}) {
  if (
    !branch ||
    runGit(["check-ref-format", `refs/heads/${branch}`]).status !== 0
  ) {
    throw new Error("A valid TARGET_BRANCH is required for news publication.");
  }
  const head = runGit(["rev-parse", "--verify", "HEAD"]);
  const commit = head.stdout?.trim();
  if (head.status !== 0 || !/^[a-f0-9]{40,64}$/.test(commit || "")) {
    throw new Error("Cannot identify the validated news commit.");
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = runGit(["push", "origin", `${commit}:refs/heads/${branch}`]);
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim();
    if (output) log(output);
    if (result.status === 0) return 0;
    // A lost acknowledgement may mean the commit is already remote. Pushing
    // the same SHA again is safe and succeeds as an up-to-date push.
    const temporary =
      result.error?.code === "ETIMEDOUT" || transientFailure.test(output);
    if (!temporary || attempt === 3) {
      log(
        `News publication failed after ${attempt} attempt(s); the validated commit was not changed.`,
      );
      return 1;
    }
    const delay = attempt * 5_000;
    log(
      `Temporary push failure; retrying the same commit in ${delay / 1_000}s (${attempt}/3).`,
    );
    await wait(delay);
  }
  return 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = await pushValidatedCommit({
      branch: process.env.TARGET_BRANCH,
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
