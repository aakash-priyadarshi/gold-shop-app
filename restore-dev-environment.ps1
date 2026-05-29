# restore-dev-environment.ps1
# This script automates restoring your developer environment, configurations, global credentials, 
# and automatically cleans and reinstalls all project dependencies (Node & Python local venvs).

$BackupDir = "C:\Users\aakas\OneDrive\Developer_Backup_May2026"
$ProjectsRoot = "C:\Users\aakas\OneDrive\project-bussiness"
$UserHome = "C:\Users\aakas"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  STARTING DEVELOPER ENVIRONMENT RESTORE  " -ForegroundColor Cyan
Write-Host "Backup Directory:  $BackupDir" -ForegroundColor Yellow
Write-Host "Projects Directory: $ProjectsRoot" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan

# Check if Backup Directory exists
if (!(Test-Path $BackupDir)) {
    Write-Host "[ERROR] Backup directory not found at $BackupDir!" -ForegroundColor Red
    Write-Host "Please make sure OneDrive has synced and downloaded this folder before running." -ForegroundColor Yellow
    Exit
}

# 1. Restore SSH Keys
Write-Host "" -ForegroundColor Gray
Write-Host "[1/7] Restoring SSH Keys..." -ForegroundColor Cyan
$SSHBackup = Join-Path $BackupDir "ssh"
$SSHDest = Join-Path $UserHome ".ssh"
if (Test-Path $SSHBackup) {
    if (!(Test-Path $SSHDest)) {
        New-Item -ItemType Directory -Force -Path $SSHDest | Out-Null
    }
    Copy-Item -Path "$SSHBackup\*" -Destination $SSHDest -Recurse -Force
    Write-Host "[OK] SSH keys restored successfully." -ForegroundColor Green
} else {
    Write-Host "[ ] No SSH backup found." -ForegroundColor Gray
}

# 2. Restore Git Global Settings
Write-Host "" -ForegroundColor Gray
Write-Host "[2/7] Restoring Git Global Config..." -ForegroundColor Cyan
$GitBackup = Join-Path $BackupDir ".gitconfig"
$GitDest = Join-Path $UserHome ".gitconfig"
if (Test-Path $GitBackup) {
    Copy-Item -Path $GitBackup -Destination $GitDest -Force
    Write-Host "[OK] Global .gitconfig restored successfully." -ForegroundColor Green
} else {
    Write-Host "[ ] No global .gitconfig backup found." -ForegroundColor Gray
}

# 3. Restore Package Manager Configs (NPM / Yarn)
Write-Host "" -ForegroundColor Gray
Write-Host "[3/7] Restoring Package Manager configs..." -ForegroundColor Cyan
foreach ($cfg in @(".npmrc", ".yarnrc")) {
    $CfgBackup = Join-Path $BackupDir $cfg
    $CfgDest = Join-Path $UserHome $cfg
    if (Test-Path $CfgBackup) {
        Copy-Item -Path $CfgBackup -Destination $CfgDest -Force
        Write-Host "[OK] Restored global $cfg" -ForegroundColor Green
    }
}

# 4. Restore Cloud Provider Credentials (AWS, GCP, etc.)
Write-Host "" -ForegroundColor Gray
Write-Host "[4/7] Restoring Cloud CLI credentials..." -ForegroundColor Cyan
$CloudDirs = @("aws", "gcloud", "kube")
foreach ($cloud in $CloudDirs) {
    $CloudBackup = Join-Path $BackupDir $cloud
    $CloudDest = Join-Path $UserHome ".$cloud"
    if ($cloud -eq "gcloud") {
        $CloudDest = Join-Path $UserHome ".config\gcloud"
    }
    
    if (Test-Path $CloudBackup) {
        if (!(Test-Path $CloudDest)) {
            New-Item -ItemType Directory -Force -Path $CloudDest | Out-Null
        }
        Copy-Item -Path "$CloudBackup\*" -Destination $CloudDest -Recurse -Force
        Write-Host "[OK] Restored $cloud credentials." -ForegroundColor Green
    }
}

# 5. Restore VS Code Configurations & Reinstall Extensions
Write-Host "" -ForegroundColor Gray
Write-Host "[5/7] Restoring VS Code configurations and extensions..." -ForegroundColor Cyan
$VSBackup = Join-Path $BackupDir "vscode"
$VSDest = "$env:APPDATA\Code\User"
if (Test-Path $VSBackup) {
    if (!(Test-Path $VSDest)) {
        New-Item -ItemType Directory -Force -Path $VSDest | Out-Null
    }
    
    # Settings & Keybindings
    foreach ($file in @("settings.json", "keybindings.json")) {
        $filePath = Join-Path $VSBackup $file
        if (Test-Path $filePath) {
            Copy-Item -Path $filePath -Destination (Join-Path $VSDest $file) -Force
            Write-Host "  Restored $file" -ForegroundColor Gray
        }
    }
    
    # Snippets
    $SnippetsBackup = Join-Path $VSBackup "snippets"
    if (Test-Path $SnippetsBackup) {
        Copy-Item -Path $SnippetsBackup -Destination (Join-Path $VSDest "snippets") -Recurse -Force
        Write-Host "  Restored user snippets" -ForegroundColor Gray
    }
    
    # Reinstall Extensions
    $ExtensionsList = Join-Path $VSBackup "extensions-list.txt"
    if (Test-Path $ExtensionsList) {
        if (Get-Command "code" -ErrorAction SilentlyContinue) {
            Write-Host "  Reinstalling VS Code extensions..." -ForegroundColor Yellow
            Get-Content $ExtensionsList | ForEach-Object {
                if ($_ -and $_.Trim()) {
                    code --install-extension $_.Trim()
                }
            }
            Write-Host "[OK] All VS Code extensions reinstalled." -ForegroundColor Green
        } else {
            Write-Host "[ ] VS Code 'code' CLI not found on PATH. Install VS Code first, then reinstall extensions using:" -ForegroundColor Yellow
            Write-Host "    Get-Content '$ExtensionsList' | ForEach-Object { code --install-extension \`$_ }" -ForegroundColor Gray
        }
    }
}

# 6. Restore Project-specific Secret Files
Write-Host "" -ForegroundColor Gray
Write-Host "[6/7] Restoring project secrets (.env, local databases, mockups, etc.)..." -ForegroundColor Cyan
$ProjectsBackup = Join-Path $BackupDir "projects"
if (Test-Path $ProjectsBackup) {
    if (Test-Path $ProjectsRoot) {
        # Copy everything back preserving structure
        $Secrets = Get-ChildItem -Path $ProjectsBackup -Recurse -File
        Write-Host "Found $($Secrets.Count) secret/config/media files to restore." -ForegroundColor Yellow
        foreach ($file in $Secrets) {
            $RelativePath = $file.FullName.Substring($ProjectsBackup.Length).TrimStart("\").TrimStart("/")
            $DestPath = Join-Path $ProjectsRoot $RelativePath
            $DestDir = Split-Path $DestPath -Parent
            
            if (!(Test-Path $DestDir)) {
                New-Item -ItemType Directory -Force -Path $DestDir | Out-Null
            }
            Copy-Item -Path $file.FullName -Destination $DestPath -Force
            Write-Host "  Restored: $RelativePath" -ForegroundColor Gray
        }
        Write-Host "[OK] All project secrets and untracked files successfully restored." -ForegroundColor Green
    } else {
        Write-Host "[!] Projects destination $ProjectsRoot not found! Please unzip your projects folder first." -ForegroundColor Red
    }
} else {
    Write-Host "[ ] No project backup folder found." -ForegroundColor Gray
}

# 7. Clean and Install Node & Python Project Dependencies
Write-Host "" -ForegroundColor Gray
Write-Host "[7/7] Cleaning and reinstalling project dependencies (Node & Python)..." -ForegroundColor Cyan
if (Test-Path $ProjectsRoot) {
    $Projects = Get-ChildItem -Path $ProjectsRoot -Directory
    
    foreach ($project in $Projects) {
        $ProjectPath = $project.FullName
        Write-Host "`n📁 Processing Project: $($project.Name)" -ForegroundColor Magenta
        
        # --- NODE.JS / PNPM RESTORE ---
        $HasPackageJson = Test-Path (Join-Path $ProjectPath "package.json")
        if ($HasPackageJson) {
            Write-Host "  [Node] Found package.json. Cleaning old node_modules..." -ForegroundColor Yellow
            $NodeModulesPath = Join-Path $ProjectPath "node_modules"
            if (Test-Path $NodeModulesPath) {
                Remove-Item -Path $NodeModulesPath -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "    Cleaned old node_modules." -ForegroundColor Gray
            }
            
            # Reinstall dependencies
            Push-Location $ProjectPath
            if (Test-Path "pnpm-lock.yaml") {
                if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
                    Write-Host "    Running 'pnpm install'..." -ForegroundColor Yellow
                    pnpm install
                } else {
                    Write-Host "    [!] pnpm not found. Trying 'npm install'..." -ForegroundColor Yellow
                    npm install
                }
            } elseif (Test-Path "yarn.lock") {
                if (Get-Command "yarn" -ErrorAction SilentlyContinue) {
                    Write-Host "    Running 'yarn install'..." -ForegroundColor Yellow
                    yarn install
                } else {
                    Write-Host "    [!] yarn not found. Trying 'npm install'..." -ForegroundColor Yellow
                    npm install
                }
            } else {
                Write-Host "    Running 'npm install'..." -ForegroundColor Yellow
                npm install
            }
            Pop-Location
        }
        
        # --- PYTHON VENV RESTORE ---
        # Search for requirements.txt or python files
        $HasRequirements = Test-Path (Join-Path $ProjectPath "requirements.txt")
        $HasPythonFiles = (Get-ChildItem -Path $ProjectPath -Filter "*.py" -Recurse -ErrorAction SilentlyContinue).Count -gt 0
        
        if ($HasRequirements -or $HasPythonFiles) {
            # Let's clean standard venv folder locations
            $VenvNames = @(".venv", "venv", ".deploy-venv")
            Write-Host "  [Python] Cleaning old virtual environments..." -ForegroundColor Yellow
            foreach ($vName in $VenvNames) {
                $VenvPath = Join-Path $ProjectPath $vName
                if (Test-Path $VenvPath) {
                    Remove-Item -Path $VenvPath -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "    Cleaned old $vName virtual environment." -ForegroundColor Gray
                }
            }
            
            # Setup a clean local venv called ".venv"
            if ($HasRequirements) {
                if (Get-Command "python" -ErrorAction SilentlyContinue) {
                    Write-Host "    Creating local virtual environment (.venv)..." -ForegroundColor Yellow
                    python -m venv (Join-Path $ProjectPath ".venv")
                    
                    $PipPath = Join-Path $ProjectPath ".venv\Scripts\pip.exe"
                    if (Test-Path $PipPath) {
                        Write-Host "    Installing dependencies from requirements.txt..." -ForegroundColor Yellow
                        & $PipPath install -r (Join-Path $ProjectPath "requirements.txt")
                        Write-Host "    [OK] Python dependencies installed successfully in local .venv." -ForegroundColor Green
                    } else {
                        Write-Host "    [!] Failed to find pip.exe inside new .venv." -ForegroundColor Red
                    }
                } else {
                    Write-Host "    [!] python CLI not found on PATH. Skipping .venv creation." -ForegroundColor Red
                }
            }
        }
    }
} else {
    Write-Host "[!] Projects root folder $ProjectsRoot not found!" -ForegroundColor Red
}

Write-Host "" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  RESTORE PROCESS COMPLETE!  " -ForegroundColor Green
Write-Host "Your clean Windows development machine is ready!" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Cyan
