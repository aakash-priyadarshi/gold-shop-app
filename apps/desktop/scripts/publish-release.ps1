<#
.SYNOPSIS
    Auto-publish Orivraa Desktop release after local build.
    Run this after `cargo tauri build` completes successfully.

.DESCRIPTION
    This script:
    1. Reads version from Cargo.toml
    2. Finds build artifacts (NSIS .exe and MSI)
    3. Copies installer to a served releases folder
    4. Calls the API /releases/publish endpoint with all metadata
    5. Prints summary

.PARAMETER ApiToken
    Admin JWT token for the API. If not provided, reads from ORIVRAA_ADMIN_TOKEN env var.

.PARAMETER BaseUrl
    API base URL. Defaults to https://api.orivraa.com

.PARAMETER DownloadBaseUrl
    Base URL where installers will be served. Defaults to https://releases.orivraa.com

.PARAMETER Changelog
    Optional changelog text. If not passed, uses git log since last tag.

.PARAMETER SkipCopy
    If set, skips copying the installer to the releases folder.

.EXAMPLE
    .\publish-release.ps1
    .\publish-release.ps1 -Changelog "Fixed login bug, improved offline sync"
    .\publish-release.ps1 -ApiToken "eyJhbG..."
#>

param(
    [string]$ApiToken = $env:ORIVRAA_ADMIN_TOKEN,
    [string]$BaseUrl = "https://api.orivraa.com",
    [string]$DownloadBaseUrl = "https://releases.orivraa.com",
    [string]$Changelog = "",
    [switch]$SkipCopy
)

$ErrorActionPreference = "Stop"

# ── Paths ────────────────────────────────────────────────
$repoRoot  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$desktopDir = Join-Path $repoRoot "apps\desktop"
$tauriDir  = Join-Path $desktopDir "src-tauri"
$bundleDir = Join-Path $tauriDir "target\release\bundle"
$releasesDir = Join-Path $repoRoot "releases"

# ── Read version from Cargo.toml ─────────────────────────
$cargoToml = Get-Content (Join-Path $tauriDir "Cargo.toml") -Raw
if ($cargoToml -match 'version\s*=\s*"(\d+\.\d+\.\d+)"') {
    $version = $Matches[1]
} else {
    Write-Error "Could not read version from Cargo.toml"
    exit 1
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor DarkYellow
Write-Host "║  Orivraa Desktop Release Publisher       ║" -ForegroundColor DarkYellow
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "  Version:  " -NoNewline; Write-Host "v$version" -ForegroundColor Cyan
Write-Host "  Platform: " -NoNewline; Write-Host "WINDOWS" -ForegroundColor Cyan

# ── Find build artifacts ─────────────────────────────────
$nsisExe = Get-ChildItem (Join-Path $bundleDir "nsis") -Filter "*.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$msiFile = Get-ChildItem (Join-Path $bundleDir "msi") -Filter "*.msi" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $nsisExe -and -not $msiFile) {
    Write-Error "No build artifacts found in $bundleDir. Run 'cargo tauri build' first."
    exit 1
}

# Prefer NSIS installer (smaller, better UX)
$installer = if ($nsisExe) { $nsisExe } else { $msiFile }
$installerType = if ($nsisExe) { "nsis" } else { "msi" }

$fileSize = $installer.Length
$fileName = $installer.Name
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)

Write-Host "  Installer:" -NoNewline; Write-Host " $fileName ($fileSizeMB MB)" -ForegroundColor Cyan
Write-Host "  Type:     " -NoNewline; Write-Host " $installerType" -ForegroundColor Cyan

# ── Generate changelog from git if not provided ──────────
if (-not $Changelog) {
    try {
        $lastTag = git -C $repoRoot describe --tags --abbrev=0 2>$null
        if ($lastTag) {
            $Changelog = git -C $repoRoot log "$lastTag..HEAD" --pretty=format:"- %s" --no-merges 2>$null | Out-String
            $Changelog = $Changelog.Trim()
        }
    } catch { }

    if (-not $Changelog) {
        # Fallback: last 10 commits
        $Changelog = git -C $repoRoot log -10 --pretty=format:"- %s" --no-merges 2>$null | Out-String
        $Changelog = $Changelog.Trim()
    }
}

if ($Changelog) {
    $changelogPreview = if ($Changelog.Length -gt 200) { $Changelog.Substring(0, 200) + "..." } else { $Changelog }
    Write-Host "  Changelog:" -ForegroundColor Gray
    Write-Host "    $changelogPreview" -ForegroundColor DarkGray
}

# ── Copy installer to releases directory ──────────────────
$downloadUrl = ""
if (-not $SkipCopy) {
    $versionDir = Join-Path $releasesDir "desktop\v$version"
    if (-not (Test-Path $versionDir)) {
        New-Item -ItemType Directory -Path $versionDir -Force | Out-Null
    }

    $destPath = Join-Path $versionDir $fileName
    Copy-Item $installer.FullName $destPath -Force
    Write-Host "  Copied to:" -NoNewline; Write-Host " $destPath" -ForegroundColor Green

    # Also copy as "latest" symlink-style
    $latestDir = Join-Path $releasesDir "desktop\latest"
    if (-not (Test-Path $latestDir)) {
        New-Item -ItemType Directory -Path $latestDir -Force | Out-Null
    }
    Copy-Item $installer.FullName (Join-Path $latestDir $fileName) -Force

    $downloadUrl = "$DownloadBaseUrl/desktop/v$version/$fileName"
}

if (-not $downloadUrl) {
    $downloadUrl = "$DownloadBaseUrl/desktop/v$version/$fileName"
}

Write-Host "  Download: " -NoNewline; Write-Host $downloadUrl -ForegroundColor Cyan

# ── Check for API token ──────────────────────────────────
if (-not $ApiToken) {
    Write-Host ""
    Write-Host "  ⚠ No API token found. Set ORIVRAA_ADMIN_TOKEN or use -ApiToken parameter." -ForegroundColor Yellow
    Write-Host "  The installer has been copied but the release was NOT published to the API." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  To publish manually, run:" -ForegroundColor Gray
    Write-Host "    .\publish-release.ps1 -ApiToken `"your-jwt-token`"" -ForegroundColor DarkGray
    Write-Host ""

    # Output the publish payload for manual use
    $payload = @{
        version      = $version
        platform     = "WINDOWS"
        downloadUrl  = $downloadUrl
        fileSize     = $fileSize
        fileName     = $fileName
        changelog    = $Changelog
        minOs        = "Windows 10 (1809+)"
        architecture = "x64"
    } | ConvertTo-Json -Compress
    Write-Host "  Or POST this to $BaseUrl/api/releases/publish:" -ForegroundColor Gray
    Write-Host "    $payload" -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

# ── Publish to API ────────────────────────────────────────
Write-Host ""
Write-Host "  Publishing to API..." -ForegroundColor Yellow

$body = @{
    version      = $version
    platform     = "WINDOWS"
    downloadUrl  = $downloadUrl
    fileSize     = $fileSize
    fileName     = $fileName
    changelog    = $Changelog
    minOs        = "Windows 10 (1809+)"
    architecture = "x64"
} | ConvertTo-Json

$headers = @{
    "Content-Type"  = "application/json"
    "Authorization" = "Bearer $ApiToken"
}

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/releases/publish" -Method POST -Body $body -Headers $headers
    Write-Host ""
    Write-Host "  ✓ Published successfully!" -ForegroundColor Green
    Write-Host "    Release ID: $($response.id)" -ForegroundColor Gray
    Write-Host "    Version:    v$($response.version)" -ForegroundColor Gray
    Write-Host "    Platform:   $($response.platform)" -ForegroundColor Gray
    Write-Host "    Latest:     $($response.isLatest)" -ForegroundColor Gray
    Write-Host ""
} catch {
    $errBody = ""
    if ($_.Exception.Response) {
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
        } catch { }
    }
    Write-Host ""
    Write-Host "  ✗ Publish failed!" -ForegroundColor Red
    Write-Host "    Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    if ($errBody) {
        Write-Host "    Body:   $errBody" -ForegroundColor Red
    }
    Write-Host "    Error:  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ── Summary ───────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host "  Release v$version published and ready!" -ForegroundColor Green
Write-Host "  Download: $downloadUrl" -ForegroundColor Cyan
Write-Host "  Admin:    https://www.orivraa.com/dashboard/admin/releases" -ForegroundColor Gray
Write-Host "  Public:   https://www.orivraa.com/download" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkYellow
Write-Host ""
