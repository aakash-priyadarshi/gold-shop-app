# Build Orivraa Desktop MSIX via Microsoft WinApp CLI (same flow as ViharaOS).
# Does not publish to GitHub Releases or R2 — output is local store-build-output/.
#
# Microsoft Learn docs:
#   WinApp CLI overview:  https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/
#   winapp pack reference: https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/usage#pack
#   Tauri + winapp guide:  https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/tauri
#   Package EXE as MSIX:   https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/packaging-cli
#   Microsoft Learn MCP:   https://learn.microsoft.com/api/mcp (microsoft_docs_search / microsoft_docs_fetch)
param(
    [string]$Version = "0.2.5",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$DesktopRoot = Split-Path $PSScriptRoot -Parent
$MsixRoot = Join-Path $DesktopRoot "msix"
$DistDir = Join-Path $MsixRoot "dist"
$AssetsDir = Join-Path $MsixRoot "Assets"
$IconsDir = Join-Path $DesktopRoot "src-tauri\icons"
$VersionQuad = if ($Version -match '^\d+\.\d+\.\d+\.\d+$') { $Version } else { "$Version.0" }

Write-Host "=== Orivraa MSIX pack (winapp) ===" -ForegroundColor Cyan
Write-Host "Version: $VersionQuad"

if (-not (Get-Command winapp -ErrorAction SilentlyContinue)) {
    throw "winapp CLI not found. Install: winget install microsoft.winappcli"
}

# Sync store tile assets from Tauri icons
New-Item -ItemType Directory -Force -Path $AssetsDir | Out-Null
Copy-Item (Join-Path $IconsDir "StoreLogo.png") (Join-Path $AssetsDir "StoreLogo.png") -Force
Copy-Item (Join-Path $IconsDir "Square150x150Logo.png") (Join-Path $AssetsDir "MedTile.png") -Force
Copy-Item (Join-Path $IconsDir "Square44x44Logo.png") (Join-Path $AssetsDir "AppList.png") -Force
Copy-Item (Join-Path $IconsDir "Square310x310Logo.png") (Join-Path $AssetsDir "WideTile.png") -Force
Copy-Item (Join-Path $AssetsDir "AppList.png") (Join-Path $AssetsDir "AppList.scale-200.png") -Force
Copy-Item (Join-Path $AssetsDir "MedTile.png") (Join-Path $AssetsDir "MedTile.scale-200.png") -Force
Copy-Item (Join-Path $AssetsDir "WideTile.png") (Join-Path $AssetsDir "WideTile.scale-200.png") -Force
Copy-Item (Join-Path $AssetsDir "AppList.png") (Join-Path $AssetsDir "AppList.targetsize-24_altform-unplated.png") -Force

# Patch Identity version only (case-sensitive — do not touch <?xml version="1.0"?>)
$manifestPath = Join-Path $MsixRoot "Package.appxmanifest"
$manifest = Get-Content $manifestPath -Raw
$manifest = [regex]::Replace(
    $manifest,
    '(<Identity[^>]*\sVersion=")[0-9.]+(")',
    "`${1}$VersionQuad`${2}"
)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($manifestPath, $manifest, $utf8NoBom)

if (-not $SkipBuild) {
    Write-Host "Building Tauri release binary..." -ForegroundColor Yellow
    Push-Location $DesktopRoot
    try {
        npx tauri build --no-bundle
    } finally {
        Pop-Location
    }
}

$releaseDirs = @(
    (Join-Path $DesktopRoot "src-tauri\target\release"),
    (Join-Path $DesktopRoot "target\release")
)
$exeSource = $null
foreach ($dir in $releaseDirs) {
    foreach ($name in @("Orivraa.exe", "gold-shop-desktop.exe")) {
        $candidate = Join-Path $dir $name
        if (Test-Path $candidate) {
            $exeSource = $candidate
            break
        }
    }
    if ($exeSource) { break }
}
if (-not $exeSource) {
    throw "Release exe not found. Run without -SkipBuild or build manually."
}

Write-Host "Staging: $exeSource" -ForegroundColor Yellow
Remove-Item $DistDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
Copy-Item $exeSource (Join-Path $DistDir "Orivraa.exe") -Force
Copy-Item $manifestPath (Join-Path $DistDir "Package.appxmanifest") -Force
Copy-Item $AssetsDir (Join-Path $DistDir "Assets") -Recurse -Force

Push-Location $MsixRoot
try {
    if (-not (Test-Path "devcert.pfx")) {
        Write-Host "Generating dev certificate from Package.appxmanifest..." -ForegroundColor Yellow
        winapp cert generate --if-exists skip --manifest .\Package.appxmanifest
    }
    Write-Host "Packing MSIX..." -ForegroundColor Yellow
    winapp pack .\dist --cert .\devcert.pfx
} finally {
    Pop-Location
}

$msix = Get-ChildItem $MsixRoot -Filter "*.msix" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $msix) {
    throw "winapp pack did not produce an .msix file in $MsixRoot"
}

$outputDir = Join-Path $DesktopRoot "store-build-output"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$dest = Join-Path $outputDir $msix.Name
Copy-Item $msix.FullName $dest -Force

Write-Host ""
Write-Host "MSIX ready: $dest" -ForegroundColor Green
Write-Host "Size: $([math]::Round($msix.Length / 1MB, 2)) MB"
Write-Host "Upload this file to Partner Center for Store verification."
