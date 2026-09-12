<#
.SYNOPSIS
    Show the state of every agent branch in the 24-hour Detective Track build.

.DESCRIPTION
    Read-only dashboard for the release captain and for any agent wondering
    whether their dependency has landed. Makes no changes: no fetch, no checkout,
    no branch creation. Run it as often as you like.

    Because it does not fetch, remote columns reflect your last fetch. Run
    "git fetch origin --prune" first if you want fresh numbers.

.PARAMETER RepoRoot
    Repository root. Defaults to the repository containing this script.

.PARAMETER Fetch
    Fetch from origin before reporting. This is the only network access, and it
    still changes no local branch.

.EXAMPLE
    .\ops\scripts\Show-AgentStatus.ps1

.EXAMPLE
    .\ops\scripts\Show-AgentStatus.ps1 -Fetch
#>
[CmdletBinding()]
param(
    [string] $RepoRoot,
    [switch] $Fetch
)

# 'Continue', not 'Stop': PowerShell 5.1 turns any native-command stderr output
# (git progress, vitest, next build) into a terminating NativeCommandError.
# Every native call below is checked explicitly via $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'

if (-not $RepoRoot) { $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..') }
$RepoRoot = (Resolve-Path $RepoRoot).Path

$planPath = Join-Path $RepoRoot 'ops\workplan.json'
if (-not (Test-Path $planPath)) {
    Write-Host "ERROR: ops/workplan.json not found at $planPath" -ForegroundColor Red
    exit 2
}
$plan = Get-Content $planPath -Raw | ConvertFrom-Json
$base = $plan.baseBranch

Push-Location $RepoRoot
try {
    if ($Fetch) {
        Write-Host 'Fetching origin...' -ForegroundColor Gray
        git fetch origin --prune
        if ($LASTEXITCODE -ne 0) { Write-Host 'WARNING: fetch failed; showing cached remote state.' -ForegroundColor Yellow }
    }

    # Map branch -> worktree path, so agents can see where work is checked out.
    $worktreeOf = @{}
    $currentPath = ''
    foreach ($line in (git worktree list --porcelain)) {
        if ($line -like 'worktree *') { $currentPath = $line.Substring(9) }
        if ($line -like 'branch refs/heads/*') { $worktreeOf[$line.Substring(18)] = $currentPath }
    }

    $currentBranch = git rev-parse --abbrev-ref HEAD
    if ($LASTEXITCODE -ne 0) { $currentBranch = '' }

    $entries = @()
    if ($plan.contractsOnly) { $entries += $plan.contractsOnly }
    $entries += $plan.agents

    Write-Host ''
    Write-Host "SCAM CITY - agent branch status" -ForegroundColor White
    Write-Host "repo: $RepoRoot"
    Write-Host "base: $base"
    if ($currentBranch) { Write-Host "here: $currentBranch" }
    if (-not $Fetch) { Write-Host 'note: remote state is from your last fetch (use -Fetch to refresh)' -ForegroundColor DarkGray }

    $rows = @()
    foreach ($e in $entries) {
        $b = $e.branch

        git show-ref --verify --quiet "refs/heads/$b"
        $hasLocal = ($LASTEXITCODE -eq 0)
        git show-ref --verify --quiet "refs/remotes/origin/$b"
        $hasRemote = ($LASTEXITCODE -eq 0)

        $ahead = ''
        $behind = ''
        $merged = ''
        if ($hasLocal -or $hasRemote) {
            if ($hasLocal) { $ref = $b } else { $ref = "origin/$b" }

            $counts = git rev-list --left-right --count "origin/$base...$ref" 2>$null
            if ($LASTEXITCODE -eq 0 -and $counts) {
                $parts = ($counts -split '\s+') | Where-Object { $_ -ne '' }
                if ($parts.Count -ge 2) {
                    $behind = $parts[0]   # commits on base the branch lacks
                    $ahead  = $parts[1]   # commits on the branch base lacks
                }
            }
            if ($ahead -eq '0' -and $hasRemote) { $merged = 'yes' }
        }

        if ($hasLocal -and $hasRemote)      { $exists = 'local+remote' }
        elseif ($hasLocal)                  { $exists = 'local only' }
        elseif ($hasRemote)                 { $exists = 'remote only' }
        else                                { $exists = 'not created' }

        $wt = ''
        if ($worktreeOf.ContainsKey($b)) { $wt = $worktreeOf[$b] }

        $rows += [pscustomobject]@{
            Agent    = $e.id
            Branch   = $b
            Exists   = $exists
            Ahead    = $ahead
            Behind   = $behind
            Worktree = $wt
        }
    }

    Write-Host ''
    $rows | Format-Table -AutoSize Agent, Branch, Exists, Ahead, Behind

    Write-Host 'Worktrees:' -ForegroundColor Cyan
    $any = $false
    foreach ($r in $rows) {
        if ($r.Worktree) { Write-Host ("  {0,-28} {1}" -f $r.Branch, $r.Worktree); $any = $true }
    }
    if (-not $any) { Write-Host '  none - create one with New-AgentWorktree.ps1' -ForegroundColor Gray }

    Write-Host ''
    Write-Host 'Dependencies:' -ForegroundColor Cyan
    foreach ($e in $entries) {
        if ($e.dependsOn -and $e.dependsOn.branches -and $e.dependsOn.branches.Count -gt 0) {
            Write-Host ("  {0,-28} waits on {1}" -f $e.branch, ($e.dependsOn.branches -join ', '))
        } else {
            Write-Host ("  {0,-28} no dependencies" -f $e.branch) -ForegroundColor Green
        }
    }

    Write-Host ''
    Write-Host 'Merge order (release captain):' -ForegroundColor Cyan
    $i = 1
    foreach ($m in $plan.release.mergeOrder) { Write-Host ("  {0}. {1}" -f $i, $m); $i++ }
    Write-Host ''
    Write-Host ('Hour-15 gate: ' + $plan.release.hour15Gate.test) -ForegroundColor Yellow
    Write-Host ''
}
finally {
    Pop-Location
}

exit 0
