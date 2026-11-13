const repositories = new Set(["hohoo-embodied-agent", "hohoo-ai-lab"]);
const relativePath = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_.\/-]+$/.test(value) &&
  value.split("/").every((part) => part && part !== "." && part !== "..");

export function reproductionScript(record) {
  if (
    !repositories.has(record.repository) ||
    !/^[a-f0-9]{40}$/.test(record.commit) ||
    ![record.directory, record.requirements, record.run, record.audit].every(
      relativePath,
    ) ||
    ![record.run, record.audit].every((file) =>
      file.startsWith(record.directory + "/"),
    )
  )
    throw Error("Invalid pinned reproduction entry");
  const directory = `${record.repository}-study-${record.commit.slice(0, 8)}`;
  // The block has its own scope and stops on native failures in Windows
  // PowerShell 5.1 too; ErrorActionPreference alone does not check exit codes.
  return `& {
  $ErrorActionPreference = 'Stop'
  function Assert-StudyCommand {
    if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE). Read the error before continuing." }
  }
  if (Test-Path -LiteralPath '${directory}') { throw 'Study directory already exists. Choose a new location.' }
  git clone https://github.com/VirtualSelect/${record.repository}.git '${directory}'; Assert-StudyCommand
  Set-Location -LiteralPath '${directory}'
  git checkout --detach ${record.commit}; Assert-StudyCommand
  python -m venv .venv; Assert-StudyCommand
  $py = '.\\.venv\\Scripts\\python.exe'
  & $py -m pip install -r ${record.requirements}; Assert-StudyCommand
  & $py ${record.run} --out outputs/my-run; Assert-StudyCommand
  & $py ${record.audit} outputs/my-run; Assert-StudyCommand
}`;
}
