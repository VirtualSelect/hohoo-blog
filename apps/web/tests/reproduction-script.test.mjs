import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { reproductionScript } from "../lib/reproduction-script.mjs";

const records = JSON.parse(
  fs.readFileSync(new URL("../../../data/reproduction.json", import.meta.url)),
);
const sample = records["embodied-ai/mujoco-controller-holdout"];

test("every existing guide keeps its own pinned runner, dependencies and audit", () => {
  for (const record of Object.values(records)) {
    const script = reproductionScript(record);
    assert.ok(script.includes(`checkout --detach ${record.commit}`));
    assert.ok(script.includes(`pip install -r ${record.requirements}`));
    assert.ok(script.includes(`${record.run} --out outputs/my-run`));
    assert.ok(script.includes(`${record.audit} outputs/my-run`));
    assert.ok(!script.includes("Remove-Item") && !script.includes("git reset"));
  }
});

test("paths and revisions cannot inject shell instructions or escape the study layout", () => {
  for (const change of [
    { commit: "main" },
    { repository: "other-repo" },
    { run: "../outside.py" },
    { audit: "other/audit.py" },
    { requirements: "requirements.txt; Write-Output injected" },
    { directory: "experiments/x'" },
  ])
    assert.throws(
      () => reproductionScript({ ...sample, ...change }),
      /Invalid pinned/,
    );
});

// These are shell-control-flow checks, not simulation, installation or network
// experiments. Only the Python invocation is substituted; all calls are logged.
// Windows PowerShell 5.1 is intentional: native exit codes do not stop it by
// ErrorActionPreference alone. Other systems skip this platform-specific check.
const windowsPowerShell =
  process.platform === "win32" ? "powershell.exe" : null;
function runFixture(
  t,
  { fail = "", existing = false, oldCommands = false } = {},
) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "hohoo-reproduction-test-"),
  );
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("hohoo-reproduction-test-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const directory = `${sample.repository}-study-${sample.commit.slice(0, 8)}`;
  if (existing) {
    fs.mkdirSync(path.join(root, directory));
    fs.writeFileSync(path.join(root, directory, "keep.txt"), "existing work");
  }
  const script = oldCommands
    ? `git clone https://example.invalid/repo.git '${directory}'\ngit checkout ${sample.commit}`
    : reproductionScript(sample).replaceAll("& $py ", "Invoke-TestPython ");
  const harness = `
$calls = New-Object 'System.Collections.Generic.List[string]'
$py = 'existing-shell-value'
function Mark-Step([string]$name) {
  $calls.Add($name)
  if ($name -eq '${fail}') { & $env:ComSpec /d /c 'exit 17' } else { & $env:ComSpec /d /c 'exit 0' }
  $global:LASTEXITCODE = $LASTEXITCODE
}
function git {
  Mark-Step ('git:' + $args[0])
  if ($LASTEXITCODE -eq 0 -and $args[0] -eq 'clone') { $null = New-Item -ItemType Directory -Path $args[-1] }
}
function python { Mark-Step 'python:venv' }
function Invoke-TestPython {
  $phase = if ($args[0] -eq '-m') { 'pip' } elseif ($args[0] -eq '${sample.run}') { 'run' } else { 'audit' }
  Mark-Step ('python:' + $phase)
}
$failure = $null
try {
${script}
} catch { $failure = $_.Exception.Message }
[pscustomobject]@{ calls=@($calls.ToArray()); error=$failure; parentPython=$py; helperLeaked=[bool](Get-Command Assert-StudyCommand -ErrorAction SilentlyContinue); shell=$PSVersionTable.PSVersion.ToString() } | ConvertTo-Json -Compress
`;
  const result = spawnSync(
    windowsPowerShell,
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", harness],
    { cwd: root, encoding: "utf8", timeout: 20000, windowsHide: true },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout.replace(/^\uFEFF/, "").trim());
  if (existing)
    assert.equal(
      fs.readFileSync(path.join(root, directory, "keep.txt"), "utf8"),
      "existing work",
    );
  return report;
}

test(
  "old unchecked commands continue to checkout after clone failure",
  { skip: !windowsPowerShell },
  (t) => {
    const result = runFixture(t, { fail: "git:clone", oldCommands: true });
    assert.deepEqual(result.calls, ["git:clone", "git:checkout"]);
  },
);

test(
  "successful shell flow reaches audit without replacing the caller’s variables or helper",
  { skip: !windowsPowerShell },
  (t) => {
    const result = runFixture(t);
    assert.deepEqual(result.calls, [
      "git:clone",
      "git:checkout",
      "python:venv",
      "python:pip",
      "python:run",
      "python:audit",
    ]);
    assert.equal(result.error, null);
    assert.equal(result.parentPython, "existing-shell-value");
    assert.equal(result.helperLeaked, false);
  },
);

test(
  "an existing study directory preserves user work and stops before git",
  { skip: !windowsPowerShell },
  (t) => {
    const result = runFixture(t, { existing: true });
    assert.deepEqual(result.calls, []);
    assert.match(result.error, /already exists/);
  },
);

for (const [index, phase] of [
  "git:clone",
  "git:checkout",
  "python:venv",
  "python:pip",
  "python:run",
  "python:audit",
].entries())
  test(
    `native failure at ${phase} stops before later steps`,
    { skip: !windowsPowerShell },
    (t) => {
      const result = runFixture(t, { fail: phase });
      assert.deepEqual(
        result.calls,
        [
          "git:clone",
          "git:checkout",
          "python:venv",
          "python:pip",
          "python:run",
          "python:audit",
        ].slice(0, index + 1),
      );
      assert.match(result.error, /Command failed \(17\)/);
    },
  );
