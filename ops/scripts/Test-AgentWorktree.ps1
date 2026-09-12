<#
.SYNOPSIS
    Run the full quality gate for an agent worktree before opening a pull request.

.DESCRIPTION
    The same gate CI runs, so a green run here means a green run there:

      1. pnpm major version is exactly 10
      2. ownership check against ops/workplan.json
      3. typecheck  (tsc --noEmit)
      4. tests      (vitest)
      5. production build (next build)

    Corepack is never used. If pnpm is not on PATH this falls back to
    "npx -y pnpm@10", which is what the repository README recommends and what
    avoids the pnpm 12 issue that corrupts node_modules on Windows.

.PARAMETER Agent
    Agent id or branch from ops/workplan.json. Defaults to the current branch.

.PARAMETER RepoRoot
    Repository root. Defaults to the repository containing this script.

.PARAMETER SkipBuild
    Skip the production build. For a fast inner loop only - never before a PR.

.EXAMPLE
    .\ops\scripts\Test-AgentWorktree.ps1

.EXAMPLE
    .\ops\scripts\Test-AgentWorktree.ps1 -Agent codex-foundation
#>
[CmdletBinding()]
param(
    [string] $Agent,
    [string] $RepoRoot,
    [switch] $SkipBuild
)

# 'Continue', not 'Stop': PowerShell 5.1 turns any native-command stderr output
# (git progress, vitest, next build) into a terminating NativeCommandError.
# Every native call below is checked explicitly via $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'

$script:Failures = @()

function Write-Section { param([string] $Text) Write-Host ''; Write-Host "== $Text" -ForegroundColor Cyan }
function Write-Ok      { param([string] $Text) Write-Host "   PASS  $Text" -ForegroundColor Green }
function Write-Bad     { param([string] $Text) Write-Host "   FAIL  $Text" -ForegroundColor Red; $script:Failures += $Text }
function Write-Info    { param([string] $Text) Write-Host "         $Text" -ForegroundColor Gray }

if (-not $RepoRoot) { $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..') }
$RepoRoot = (Resolve-Path $RepoRoot).Path

$planPath = Join-Path $RepoRoot 'ops\workplan.json'
if (-not (Test-Path $planPath)) {
    Write-Host "ERROR: ops/workplan.json not found at $planPath" -ForegroundColor Red
    exit 2
}
$plan = Get-Content $planPath -Raw | ConvertFrom-Json

$pkgPath = Join-Path $RepoRoot 'package.json'
if (-not (Test-Path $pkgPath)) {
    Write-Host "ERROR: package.json not found at $pkgPath" -ForegroundColor Red
    exit 2
}
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json

Push-Location $RepoRoot
try {
    if (-not $Agent) {
        $Agent = git rev-parse --abbrev-ref HEAD
        if ($LASTEXITCODE -ne 0) { $Agent = '' }
    }

    Write-Host ''
    Write-Host "Quality gate - $RepoRoot" -ForegroundColor White
    Write-Host "Branch/agent: $Agent" -ForegroundColor White

    # --- 1. pnpm 10 --------------------------------------------------------

    Write-Section 'pnpm version'
    $pnpmCmd = $null
    $pnpmArgsPrefix = @()
    $onPath = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($onPath) {
        $pnpmCmd = 'pnpm'
    } else {
        Write-Info 'pnpm is not on PATH - falling back to "npx -y pnpm@10" (as the README recommends)'
        $pnpmCmd = 'npx'
        $pnpmArgsPrefix = @('-y', 'pnpm@10')
    }

    $versionArgs = $pnpmArgsPrefix + @('--version')
    $pnpmVersion = & $pnpmCmd @versionArgs
    if ($LASTEXITCODE -ne 0 -or -not $pnpmVersion) {
        Write-Bad 'could not determine the pnpm version'
        Write-Info 'Install pnpm 10, or make sure npx can reach the registry.'
        Write-Info 'Do NOT use corepack: it resolves pnpm 12, which corrupts node_modules on Windows.'
        Pop-Location
        exit 1
    }
    $pnpmVersion = ("$pnpmVersion").Trim()
    $pnpmMajor = [int]($pnpmVersion.Split('.')[0])
    $wantMajor = [int]$plan.qualityGate.packageManagerMajor
    if ($pnpmMajor -ne $wantMajor) {
        Write-Bad "pnpm major version is $pnpmMajor, expected exactly $wantMajor (found $pnpmVersion)"
        Write-Info 'Use: npx -y pnpm@10 <command>'
        Write-Info 'Do NOT use corepack.'
        Pop-Location
        exit 1
    }
    Write-Ok "pnpm $pnpmVersion"

    function Invoke-PnpmScript {
        param([string] $ScriptName, [string] $Label)

        if (-not (($pkg.scripts.PSObject.Properties.Name) -contains $ScriptName)) {
            Write-Bad "$Label - package.json has no `"$ScriptName`" script"
            Write-Info "Available scripts: $($pkg.scripts.PSObject.Properties.Name -join ', ')"
            return
        }
        $runArgs = $pnpmArgsPrefix + @($ScriptName)
        & $pnpmCmd @runArgs
        if ($LASTEXITCODE -ne 0) { Write-Bad "$Label (exit $LASTEXITCODE)" } else { Write-Ok $Label }
    }

    # --- 2. ownership ------------------------------------------------------

    Write-Section 'Ownership'
    $checker = Join-Path $RepoRoot 'ops\scripts\check-ownership.mjs'
    if (-not (Test-Path $checker)) {
        Write-Bad 'ops/scripts/check-ownership.mjs is missing'
    } else {
        $entries = @()
        if ($plan.contractsOnly) { $entries += $plan.contractsOnly }
        $entries += $plan.agents
        $entry = $entries | Where-Object { $_.id -eq $Agent -or $_.branch -eq $Agent } | Select-Object -First 1

        if ($entry) {
            node $checker --branch $entry.branch
        } else {
            node $checker
        }
        if ($LASTEXITCODE -ne 0) { Write-Bad "ownership check (exit $LASTEXITCODE)" } else { Write-Ok 'ownership' }
    }

    # --- 3-5. typecheck, test, build ---------------------------------------

    Write-Section 'Typecheck'
    Invoke-PnpmScript -ScriptName 'typecheck' -Label 'typecheck'

    Write-Section 'Tests'
    Invoke-PnpmScript -ScriptName 'test' -Label 'tests'

    if ($SkipBuild) {
        Write-Section 'Build'
        Write-Info 'skipped (-SkipBuild). Never open a PR without a green build.'
    } else {
        Write-Section 'Production build'
        Invoke-PnpmScript -ScriptName 'build' -Label 'build'
    }
}
finally {
    Pop-Location
}

# --- Summary ---------------------------------------------------------------

Write-Host ''
if ($script:Failures.Count -eq 0) {
    Write-Host 'QUALITY GATE PASSED' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Next:' -ForegroundColor Gray
    Write-Host '  git fetch origin main' -ForegroundColor Gray
    Write-Host '  git rebase origin/main' -ForegroundColor Gray
    Write-Host '  # then push and open a PR using the template' -ForegroundColor Gray
    Write-Host ''
    exit 0
}

Write-Host 'QUALITY GATE FAILED' -ForegroundColor Red
Write-Host ''
foreach ($f in $script:Failures) { Write-Host "  - $f" -ForegroundColor Red }
Write-Host ''
Write-Host 'Fix these before opening a PR. CI runs the same checks and will block the merge.' -ForegroundColor Yellow
Write-Host ''
exit 1
