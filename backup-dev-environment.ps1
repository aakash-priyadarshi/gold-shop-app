# backup-dev-environment.ps1
# This script creates a secure backup of all local-only credentials, environment files,
# projects configurations, SSH keys, Git settings, VS Code configurations, AND ALL project source code.

# Define backup destination (using OneDrive ensures it is synced to the cloud before you format)
$BackupDir = "C:\Users\aakas\OneDrive\Developer_Backup_May2026"
$ProjectsRoot = "C:\Users\aakas\OneDrive\project-bussiness"
$UserHome = "C:\Users\aakas"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  STARTING COMPLETE DEVELOPER BACKUP  " -ForegroundColor Cyan
Write-Host "Backup Destination: $BackupDir" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Create Backup Directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Write-Host "[OK] Created backup directory." -ForegroundColor Green
}

# Helper to copy files preserving directory structure
function Copy-PreserveStructure ($SourceFile, $SourceBaseDir, $DestBaseDir) {
    # Calculate relative path manually to handle potential edge cases
    $RelativePath = $SourceFile.Substring($SourceBaseDir.Length)
    $RelativePath = $RelativePath.TrimStart("\").TrimStart("/")
    
    $DestFile = Join-Path $DestBaseDir $RelativePath
    $DestDir = Split-Path $DestFile -Parent
    
    if (!(Test-Path $DestDir)) {
        New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
    }
    Copy-Item -Path $SourceFile -Destination $DestFile -Force
    Write-Host "  Copying: $RelativePath -> Backup" -ForegroundColor Gray
}

# 2. Copying ALL Project Source Code, Secrets, Assets (Excluding heavy/build dependencies)
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Copying all project source code, configurations, and assets..." -ForegroundColor Cyan
if (Test-Path $ProjectsRoot) {
    # Exclude system, build outputs, and heavy dependencies
    $ExcludePatterns = @(
        "node_modules", 
        "\\\.venv", 
        "\\\.next", 
        "\\\.turbo", 
        "\\\.pnpm-store", 
        "\\\.git",
        "\\\.deploy-venv",
        "\\\.idea",
        "\\\.vscode",
        "\\\.cache",
        "\\\.nyc_output",
        "\\\.wrangler",
        "\\\.auth",
        "\\\.auth",
        "\\\/target",
        "\\\/build",
        "\\\/dist",
        "\\\/coverage",
        "playwright-report",
        "test-results",
        "e2e-results"
    )
    
    $AllFiles = Get-ChildItem -Path $ProjectsRoot -Recurse -File -ErrorAction SilentlyContinue
    
    $FilteredFiles = $AllFiles | Where-Object {
        $FilePath = $_.FullName
        
        # Check if the file is inside any of our excluded directories
        $ShouldExclude = $false
        foreach ($pattern in $ExcludePatterns) {
            if ($FilePath -match $pattern) {
                $ShouldExclude = $true
                break
            }
        }
        
        return (-not $ShouldExclude)
    }
    
    $ProjectBackupDir = Join-Path $BackupDir "projects"
    Write-Host "Found $($FilteredFiles.Count) source files to back up across all projects." -ForegroundColor Yellow
    foreach ($file in $FilteredFiles) {
        Copy-PreserveStructure $file.FullName $ProjectsRoot $ProjectBackupDir
    }
} else {
    Write-Host "[!] Projects directory $ProjectsRoot not found!" -ForegroundColor Red
}

# 3. Backup SSH Keys
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Backing up SSH Keys..." -ForegroundColor Cyan
$SSHDir = Join-Path $UserHome ".ssh"
if (Test-Path $SSHDir) {
    $SSHBackupDir = Join-Path $BackupDir "ssh"
    Copy-Item -Path $SSHDir -Destination $SSHBackupDir -Recurse -Force
    Write-Host "[OK] SSH keys backed up successfully." -ForegroundColor Green
} else {
    Write-Host "[ ] No SSH keys directory found." -ForegroundColor Gray
}

# 4. Backup Global Git Configuration
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Backing up Git configuration..." -ForegroundColor Cyan
$GitConfig = Join-Path $UserHome ".gitconfig"
if (Test-Path $GitConfig) {
    Copy-Item -Path $GitConfig -Destination (Join-Path $BackupDir ".gitconfig") -Force
    Write-Host "[OK] Global .gitconfig backed up successfully." -ForegroundColor Green
} else {
    Write-Host "[ ] No global .gitconfig found." -ForegroundColor Gray
}

# 5. Backup NPM/Yarn credentials
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Backing up Package Manager configs..." -ForegroundColor Cyan
$Npmrc = Join-Path $UserHome ".npmrc"
if (Test-Path $Npmrc) {
    Copy-Item -Path $Npmrc -Destination (Join-Path $BackupDir ".npmrc") -Force
    Write-Host "[OK] Global .npmrc backed up successfully." -ForegroundColor Green
}
$Yarnrc = Join-Path $UserHome ".yarnrc"
if (Test-Path $Yarnrc) {
    Copy-Item -Path $Yarnrc -Destination (Join-Path $BackupDir ".yarnrc") -Force
    Write-Host "[OK] Global .yarnrc backed up successfully." -ForegroundColor Green
}

# 6. Cloud Provider Credentials (AWS, GCP, etc.)
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Backing up Cloud CLI Credentials (if present)..." -ForegroundColor Cyan
$CloudDirs = @(
    @{ Name = "aws"; Path = Join-Path $UserHome ".aws" },
    @{ Name = "gcloud"; Path = Join-Path $UserHome ".config\gcloud" },
    @{ Name = "kube"; Path = Join-Path $UserHome ".kube" }
)
foreach ($cloud in $CloudDirs) {
    if (Test-Path $cloud.Path) {
        $CloudBackupDir = Join-Path $BackupDir $cloud.Name
        Copy-Item -Path $cloud.Path -Destination $CloudBackupDir -Recurse -Force
        Write-Host "[OK] Backed up $($cloud.Name) credentials." -ForegroundColor Green
    }
}

# 7. Backup VS Code configuration, shortcuts, and list of extensions
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Backing up VS Code settings and extension list..." -ForegroundColor Cyan
$VSCodeDir = "$env:APPDATA\Code\User"
if (Test-Path $VSCodeDir) {
    $VSBackupDir = Join-Path $BackupDir "vscode"
    New-Item -ItemType Directory -Force -Path $VSBackupDir | Out-Null
    
    # Copy key settings files
    foreach ($file in @("settings.json", "keybindings.json")) {
        $filePath = Join-Path $VSCodeDir $file
        if (Test-Path $filePath) {
            Copy-Item -Path $filePath -Destination (Join-Path $VSBackupDir $file) -Force
            Write-Host "  Backed up $file" -ForegroundColor Gray
        }
    }
    
    # Copy snippets directory if exists
    $SnippetsDir = Join-Path $VSCodeDir "snippets"
    if (Test-Path $SnippetsDir) {
        Copy-Item -Path $SnippetsDir -Destination (Join-Path $VSBackupDir "snippets") -Recurse -Force
        Write-Host "  Backed up user snippets" -ForegroundColor Gray
    }
    
    # Export extensions list
    if (Get-Command "code" -ErrorAction SilentlyContinue) {
        code --list-extensions > (Join-Path $VSBackupDir "extensions-list.txt")
        Write-Host "[OK] Exported VS Code extensions list." -ForegroundColor Green
    } else {
        Write-Host "[ ] VS Code CLI 'code' not found on PATH. Skipping extensions list export." -ForegroundColor Yellow
    }
} else {
    Write-Host "[ ] VS Code configurations directory not found." -ForegroundColor Gray
}

# 8. Backup Global Environment Variables
Write-Host "" -ForegroundColor Gray
Write-Host "[INFO] Exporting active Windows Environment Variables..." -ForegroundColor Cyan
Get-ChildItem Env: | Select-Object Name, Value | Format-List | Out-File (Join-Path $BackupDir "environment-variables.txt")
Write-Host "[OK] Exported global environment variables list." -ForegroundColor Green

# Summary
Write-Host "" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  BACKUP COMPLETE!  " -ForegroundColor Green
Write-Host "All secret files and developer configs are backed up under:" -ForegroundColor White
Write-Host "  $BackupDir" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Important Next Steps:" -ForegroundColor Cyan
Write-Host "1. Ensure OneDrive is fully synced (check the OneDrive icon in your taskbar)." -ForegroundColor White
Write-Host "2. Double-check that your private SSH keys (under $BackupDir\ssh) were copied." -ForegroundColor White
Write-Host "3. To restore VS Code extensions later, run: " -ForegroundColor White
Write-Host '   Get-Content .\vscode\extensions-list.txt | ForEach-Object { code --install-extension $_ }' -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
