# Dot-source this script to refresh an existing PowerShell terminal after a Node upgrade.
# Usage: . .\scripts\use-node.ps1
$nodePaths = @(
  [Environment]::GetEnvironmentVariable('Path', 'Machine')
  [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path
) -join ';'
$env:Path = (($nodePaths -split ';' | Where-Object { $_ } | Select-Object -Unique) -join ';')
Get-Command node, npm | Select-Object Name, Source
node --version
npm --version
