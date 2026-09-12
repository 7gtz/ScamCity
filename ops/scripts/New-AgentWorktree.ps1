<#
.SYNOPSIS
    Create an isolated git worktree for one agent in the 24-hour Detective Track build.

.DESCRIPTION
    Reads ops/workplan.json, fetches origin/main, and creates a dedicated worktree
    and branch for the named agent so five agents can work in parallel without
    sharing a checkout.

    This script is deliberately non-destructive. It will refuse to act rather than
    overwrite anything: it never deletes a worktree, never force-resets a branch,
    and never discards uncommitted work.

.PARAMETER Agent
    Agent id or branch name from ops/workplan.json.
    For example: codex-foundation, or feat/foundation-state.

.PARAMETER RepoRoot
    Repository root. Defaults to the repository containing this script.

.PARAMETER WorktreeRoot
    Directory to create worktrees in. Defaults to a "scamcity-worktrees" folder
    beside the repository.

.PARAMETER List
    List the agents defined in the workplan and exit.

.EXAMPLE
    .\ops\scripts\New-AgentWorktree.ps1 -List

.EXAMPLE
    .\ops\scripts\New-AgentWorktree.ps1 -Agent codex-foundation

.EXAMPLE
    .\ops\scripts\New-AgentWorktree.ps1 -Agent feat/world-ui -WorktreeRoot D:\work
#>
[CmdletBinding()]
param(
    [string] $Agent,
    [string] $RepoRoot,
    [string] $WorktreeRoot,
    [switch] $List
)

# 'Continue', not 'Stop': PowerShell 5.1 turns any native-command stderr output
# (git progress, vitest, next build) into a terminating NativeCommandError.
# Every native call below is checked explicitly via $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'

function Write-Section { param([string] $Text) Write-Host ''; Write-Host $Text -ForegroundColor Cyan }
function Write-Ok      { param([string] $Text) Write-Host "  OK    $Text" -ForegroundColor Green }
function Write-Info    { param([string] $Text) Write-Host "        $Text" -ForegroundColor Gray }
function Fail {
    param([string] $Text, [string[]] $Hints)
    Write-Host ''
    Write-Host "ERROR: $Text" -ForegroundColor Red
    if ($Hints) { Write-Host ''; foreach ($h in $Hints) { Write-Host "  - $h" -ForegroundColor Yellow } }
    Write-Host ''
    exit 1
}

# --- Locate the repository -------------------------------------------------

if (-not $RepoRoot) { $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..') }
if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    Fail "No git repository at $RepoRoot" @('Pass -RepoRoot <path> pointing at your ScamCity clone.')
}
$RepoRoot = (Resolve-Path $RepoRoot).Path

$planPath = Join-Path $RepoRoot 'ops\workplan.json'
if (-not (Test-Path $planPath)) { Fail "ops/workplan.json not found at $planPath" }
$plan = Get-Content $planPath -Raw | ConvertFrom-Json

# The contracts branch is an agent for our purposes, but lives in its own field.
$entries = @()
if ($plan.contractsOnly) { $entries += $plan.contractsOnly }
$entries += $plan.agents

if ($List -or -not $Agent) {
    Write-Section 'Agents defined in ops/workplan.json'
    foreach ($e in $entries) {
        Write-Host ''
        Write-Host ("  {0}" -f $e.id) -ForegroundColor White
        Write-Host ("    branch : {0}" -f $e.branch)
        Write-Host ("    role   : {0}" -f $e.displayName)
        if ($e.dependsOn -and $e.dependsOn.branches -and $e.dependsOn.branches.Count -gt 0) {
            Write-Host ("    needs  : {0}" -f ($e.dependsOn.branches -join ', '))
        } else {
            Write-Host  "    needs  : nothing - can start immediately"
        }
    }
    Write-Host ''
    if (-not $Agent) { Write-Host 'Run again with -Agent <id> to create a worktree.' -ForegroundColor Yellow; Write-Host '' }
    exit 0
}

$entry = $entries | Where-Object { $_.id -eq $Agent -or $_.branch -eq $Agent } | Select-Object -First 1
if (-not $entry) {
    Fail "Unknown agent: $Agent" @('Run with -List to see the valid agent ids and branches.')
}

$branch = $entry.branch
if (-not $WorktreeRoot) { $WorktreeRoot = Join-Path (Split-Path $RepoRoot -Parent) 'scamcity-worktrees' }
$target = Join-Path $WorktreeRoot ("scamcity-" + $entry.id)

Write-Section "Preparing worktree for $($entry.displayName)"
Write-Info "repo     $RepoRoot"
Write-Info "agent    $($entry.id)"
Write-Info "branch   $branch"
Write-Info "path     $target"

# --- Safety checks before we change anything -------------------------------

Write-Section 'Safety checks'

Push-Location $RepoRoot
try {
    $status = git status --porcelain
    if ($LASTEXITCODE -ne 0) { Fail 'git status failed. Is this a healthy repository?' }
    if ($status) {
        Write-Host ''
        Write-Host 'Uncommitted changes in the main checkout:' -ForegroundColor Yellow
        $status | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        Fail 'The working tree must be clean before creating a worktree.' @(
            'Commit your work, or stash it with: git stash push -u',
            'This script will not touch your uncommitted changes.'
        )
    }
    Write-Ok 'working tree is clean'

    if (Test-Path $target) {
        Fail "A directory already exists at $target" @(
            'Use that worktree, or choose a different -WorktreeRoot.',
            'This script never deletes or overwrites an existing directory.'
        )
    }
    Write-Ok 'target directory is free'

    # Is the branch already checked out in another worktree? git would refuse
    # anyway, but a clear message beats a raw git error at hour 19.
    $existing = git worktree list --porcelain
    $inUse = $false
    $inUsePath = ''
    $currentPath = ''
    foreach ($line in $existing) {
        if ($line -like 'worktree *') { $currentPath = $line.Substring(9) }
        if ($line -eq "branch refs/heads/$branch") { $inUse = $true; $inUsePath = $currentPath }
    }
    if ($inUse) {
        Fail "Branch $branch is already checked out at $inUsePath" @(
            'Work in that worktree instead.',
            'A branch can only be checked out in one worktree at a time.'
        )
    }
    Write-Ok "branch $branch is not checked out elsewhere"

    Write-Section 'Fetching origin'
    git fetch origin $plan.baseBranch --prune
    if ($LASTEXITCODE -ne 0) {
        Fail "Could not fetch origin/$($plan.baseBranch)" @('Check your network and that origin is reachable.')
    }
    Write-Ok "fetched origin/$($plan.baseBranch)"

    # --- Create the worktree ------------------------------------------------

    Write-Section 'Creating worktree'
    if (-not (Test-Path $WorktreeRoot)) { New-Item -ItemType Directory -Path $WorktreeRoot -Force | Out-Null }

    git show-ref --verify --quiet "refs/heads/$branch"; $localExists = ($LASTEXITCODE -eq 0)
    git show-ref --verify --quiet "refs/remotes/origin/$branch"; $remoteExists = ($LASTEXITCODE -eq 0)

    if ($localExists) {
        Write-Info "branch $branch already exists locally - checking it out (no reset)"
        git worktree add $target $branch
    } elseif ($remoteExists) {
        Write-Info "branch $branch exists on origin - tracking it"
        git worktree add --track -b $branch $target "origin/$branch"
    } else {
        Write-Info "creating $branch from origin/$($plan.baseBranch)"
        git worktree add -b $branch $target "origin/$($plan.baseBranch)"
    }
    if ($LASTEXITCODE -ne 0) { Fail 'git worktree add failed. Nothing was deleted; inspect the output above.' }
    Write-Ok "worktree created at $target"
}
finally {
    Pop-Location
}

# --- Brief the agent -------------------------------------------------------

Write-Section 'Your workspace'
Write-Host "  path    $target"
Write-Host "  branch  $branch"

Write-Section 'Paths you own (everything else is off limits)'
foreach ($p in $entry.allowedPaths) { Write-Host "  + $p" -ForegroundColor Green }
if ($entry.forbiddenPaths -and $entry.forbiddenPaths.Count -gt 0) {
    Write-Host ''
    Write-Host '  Shared contracts - import them, never edit them:' -ForegroundColor Yellow
    foreach ($p in $entry.forbiddenPaths) { Write-Host "  - $p" -ForegroundColor Red }
}
if ($entry.additiveOnlyPaths -and $entry.additiveOnlyPaths.Count -gt 0) {
    Write-Host ''
    Write-Host '  Additive changes only (no refactors, no reformatting):' -ForegroundColor Yellow
    foreach ($p in $entry.additiveOnlyPaths) { Write-Host "  ~ $p" -ForegroundColor Yellow }
}

Write-Section 'Before you start'
if ($entry.dependsOn -and $entry.dependsOn.branches -and $entry.dependsOn.branches.Count -gt 0) {
    Write-Host '  These must be merged to main first:' -ForegroundColor Yellow
    foreach ($d in $entry.dependsOn.branches) { Write-Host "    $d" -ForegroundColor Yellow }
    Write-Host '  Watch the "24-hour coordination board" issue for the merge announcement.' -ForegroundColor Gray
} else {
    Write-Host '  No dependencies. You can start immediately.' -ForegroundColor Green
}

Write-Section 'Next commands'
Write-Host "  cd $target"
if ($entry.promptFile) { Write-Host "  # read $($entry.promptFile) and $($plan.planDoc)" -ForegroundColor Gray }
Write-Host '  npx -y pnpm@10 install'
Write-Host "  .\ops\scripts\Test-AgentWorktree.ps1 -Agent $($entry.id)"
Write-Host ''
