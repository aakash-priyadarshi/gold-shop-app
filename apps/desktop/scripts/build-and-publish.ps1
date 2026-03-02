<#
.SYNOPSIS
    Build and publish Orivraa Desktop in one step.
    Runs: frontend export → cargo tauri build → auto-publish to API

.PARAMETER Changelog
    Optional changelog. Auto-generated from git if omitted.

.PARAMETER SkipBuild
    Skip the build step, just publish existing artifacts.

.EXAMPLE
    .\build-and-publish.ps1
    .\build-and-publish.ps1 -Changelog "New feature: offline POS"
    .\build-and-publish.ps1 -SkipBuild
#>

param(
    [string]$Changelog = "",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$desktopDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $desktopDir)
$webDir = Join-Path $repoRoot "apps\web"
$tauriDir = Join-Path $desktopDir "src-tauri"

# Read version
$cargoToml = Get-Content (Join-Path $tauriDir "Cargo.toml") -Raw
if ($cargoToml -match 'version\s*=\s*"(\d+\.\d+\.\d+)"') {
    $version = $Matches[1]
} else {
    Write-Error "Could not read version from Cargo.toml"
    exit 1
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor DarkYellow
Write-Host "║  Orivraa Desktop — Build & Publish Pipeline   ║" -ForegroundColor DarkYellow
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Version: v$version" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipBuild) {
    # ── Step 1: Build frontend for desktop ────────────────
    Write-Host "━━━ Step 1/3: Building frontend for desktop..." -ForegroundColor Yellow
    Push-Location $webDir
    try {
        $env:NEXT_PUBLIC_IS_DESKTOP = "true"
        pnpm build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

        # Export static files for Tauri
        $distDesktop = Join-Path $desktopDir "dist-desktop"
        if (Test-Path $distDesktop) { Remove-Item $distDesktop -Recurse -Force }
        Copy-Item "out" $distDesktop -Recurse
        Write-Host "  ✓ Frontend exported to dist-desktop" -ForegroundColor Green
    } finally {
        $env:NEXT_PUBLIC_IS_DESKTOP = ""
        Pop-Location
    }
    Write-Host ""

    # ── Step 2: Build Tauri desktop app ───────────────────
    Write-Host "━━━ Step 2/3: Building Tauri desktop app..." -ForegroundColor Yellow
    Push-Location $tauriDir
    try {
        cargo tauri build
        if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }
        Write-Host "  ✓ Desktop build complete" -ForegroundColor Green
    } finally {
        Pop-Location
    }
    Write-Host ""
} else {
    Write-Host "  Skipping build (--SkipBuild)" -ForegroundColor DarkGray
    Write-Host ""
}

# ── Step 3: Publish release ──────────────────────────────
Write-Host "━━━ Step 3/3: Publishing release..." -ForegroundColor Yellow
$publishArgs = @()
if ($Changelog) { $publishArgs += "-Changelog", "`"$Changelog`"" }

& (Join-Path $scriptDir "publish-release.ps1") @publishArgs

Write-Host ""
Write-Host "  ✓ Build & Publish pipeline complete!" -ForegroundColor Green
Write-Host ""
