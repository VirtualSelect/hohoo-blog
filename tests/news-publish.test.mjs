import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pushValidatedCommit } from "../scripts/news/push.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hohoo-news-push-"));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("hohoo-news-push-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  function git(args, cwd = root) {
    return spawnSync("git", args, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "C" },
    });
  }
  function ok(args, cwd) {
    const result = git(args, cwd);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  ok(["init", "--bare", "--initial-branch=main", remote]);
  ok(["init", "--initial-branch=main", work]);
  ok(["config", "user.name", "Publish test"], work);
  ok(["config", "user.email", "publish-test@example.invalid"], work);
  ok(["config", "commit.gpgsign", "false"], work);
  ok(["remote", "add", "origin", remote], work);
  fs.writeFileSync(path.join(work, "news.txt"), "validated local fixture\n");
  ok(["add", "news.txt"], work);
  ok(["commit", "-m", "validated news"], work);
  const sha = ok(["rev-parse", "HEAD"], work);
  return {
    root,
    remote,
    work,
    sha,
    git,
    ok,
    runGit: (args) => git(args, work),
  };
}
const silent = { log: () => {}, wait: async () => {} };

test("temporary server failure retries the same commit and publishes once", async (t) => {
  const f = fixture(t);
  const pushes = [],
    waits = [];
  const code = await pushValidatedCommit({
    ...silent,
    branch: "main",
    runGit(args) {
      if (args[0] === "push") {
        pushes.push(args);
        if (pushes.length === 1)
          return { status: 1, stderr: "remote: Internal Server Error" };
      }
      return f.runGit(args);
    },
    wait: async (ms) => waits.push(ms),
  });
  assert.equal(code, 0);
  assert.deepEqual(
    pushes,
    Array(2).fill(["push", "origin", `${f.sha}:refs/heads/main`]),
  );
  assert.deepEqual(waits, [5000]);
  assert.equal(f.ok(["rev-parse", "main"], f.remote), f.sha);
  assert.equal(f.ok(["rev-list", "--count", "main"], f.remote), "1");
});

test("lost acknowledgement after acceptance does not duplicate the published commit", async (t) => {
  const f = fixture(t);
  let pushes = 0;
  const code = await pushValidatedCommit({
    ...silent,
    branch: "main",
    runGit(args) {
      const result = f.runGit(args);
      if (args[0] === "push" && ++pushes === 1) {
        assert.equal(result.status, 0);
        return {
          status: 1,
          stderr: "fatal: the remote end hung up unexpectedly",
        };
      }
      return result;
    },
  });
  assert.equal(code, 0);
  assert.equal(pushes, 2);
  assert.equal(f.ok(["rev-list", "--count", "main"], f.remote), "1");
});

test("persistent temporary failure stops after three attempts", async (t) => {
  const f = fixture(t);
  let pushes = 0;
  const waits = [];
  const code = await pushValidatedCommit({
    ...silent,
    branch: "main",
    runGit(args) {
      if (args[0] !== "push") return f.runGit(args);
      pushes++;
      return {
        status: 1,
        stderr:
          "fatal: unable to access remote: The requested URL returned error: 503",
      };
    },
    wait: async (ms) => waits.push(ms),
  });
  assert.equal(code, 1);
  assert.equal(pushes, 3);
  assert.deepEqual(waits, [5000, 10000]);
  assert.notEqual(f.git(["rev-parse", "--verify", "main"], f.remote).status, 0);
});

test("a newer remote commit is never overwritten or silently rebased", async (t) => {
  const f = fixture(t);
  f.ok(["push", "origin", "HEAD:main"], f.work);
  const other = path.join(f.root, "other");
  f.ok(["clone", f.remote, other]);
  f.ok(
    [
      "-c",
      "user.name=Other",
      "-c",
      "user.email=other@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "remote advance",
    ],
    other,
  );
  f.ok(["push", "origin", "HEAD:main"], other);
  const newer = f.ok(["rev-parse", "HEAD"], other);
  let pushes = 0;
  const code = await pushValidatedCommit({
    ...silent,
    branch: "main",
    runGit(args) {
      if (args[0] === "push") pushes++;
      return f.runGit(args);
    },
  });
  assert.equal(code, 1);
  assert.equal(pushes, 1);
  assert.equal(f.ok(["rev-parse", "main"], f.remote), newer);
  assert.equal(f.ok(["rev-parse", "HEAD"], f.work), f.sha);
});
