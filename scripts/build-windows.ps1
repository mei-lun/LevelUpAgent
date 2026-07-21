[CmdletBinding()]
param(
    [ValidateSet("nsis", "msi", "all", "none")]
    [string]$Bundle = "nsis",
    [switch]$SkipTests,
    [switch]$SkipInstall,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Show-Usage {
    Write-Host "LevelUpAgent Windows build"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  Build-Windows.cmd"
    Write-Host "  Build-Windows.cmd -Bundle nsis|msi|all|none [-SkipTests] [-SkipInstall]"
    Write-Host ""
    Write-Host "Default output: artifacts\windows"
}

if ($Help) {
    Show-Usage
    exit 0
}

if ($env:OS -ne "Windows_NT") {
    throw "This script must run on Windows."
}

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RootDir

function Find-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Names,
        [string[]]$CandidatePaths = @(),
        [Parameter(Mandatory = $true)]
        [string]$InstallHint
    )

    foreach ($Candidate in $CandidatePaths) {
        if (-not [string]::IsNullOrWhiteSpace($Candidate) -and (Test-Path $Candidate)) {
            return (Resolve-Path $Candidate).Path
        }
    }
    foreach ($Name in $Names) {
        $Command = Get-Command $Name -ErrorAction SilentlyContinue
        if ($null -ne $Command) {
            return $Command.Source
        }
    }
    throw "Required command not found: $($Names -join ', '). $InstallHint"
}

function Read-Version {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $Text = (& $Command --version | Select-Object -First 1).Trim()
    if ($Text -notmatch '(\d+\.\d+\.\d+)') {
        throw "Could not read $Label version from: $Text"
    }
    return [version]$Matches[1]
}

function Invoke-BuildStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

$CodexRuntime = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$Node = Find-Command `
    -Names @("node.exe", "node") `
    -CandidatePaths @(
        (Join-Path $env:ProgramFiles "nodejs\node.exe"),
        (Join-Path $CodexRuntime "node\bin\node.exe"),
        "D:\nodejs\node.exe"
    ) `
    -InstallHint "Install Node.js 22 or newer."

# Child processes started by pnpm must use the same compatible Node.js runtime.
$env:PATH = "$(Split-Path $Node);$env:PATH"

$Pnpm = Find-Command `
    -Names @("pnpm.cmd", "pnpm.exe", "pnpm") `
    -CandidatePaths @(
        (Join-Path $CodexRuntime "bin\fallback\pnpm.cmd"),
        (Join-Path $env:LOCALAPPDATA "pnpm\pnpm.cmd"),
        (Join-Path $env:APPDATA "npm\pnpm.cmd")
    ) `
    -InstallHint "Install pnpm 11 or run: corepack enable"
$env:PATH = "$(Split-Path $Pnpm);$env:PATH"
$Cargo = Find-Command `
    -Names @("cargo.exe", "cargo") `
    -CandidatePaths @((Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe")) `
    -InstallHint "Install Rust with rustup."

$NodeVersion = Read-Version -Command $Node -Label "Node.js"
$PnpmVersion = Read-Version -Command $Pnpm -Label "pnpm"
$CargoVersion = Read-Version -Command $Cargo -Label "Cargo"

if ($NodeVersion -lt [version]"22.0.0") {
    throw "Node.js 22 or newer is required; found $NodeVersion."
}
if ($PnpmVersion -lt [version]"11.0.0") {
    throw "pnpm 11 or newer is required; found $PnpmVersion."
}

$Package = Get-Content (Join-Path $RootDir "package.json") -Raw | ConvertFrom-Json
$Version = [string]$Package.version
$OutputDir = Join-Path $RootDir "artifacts\windows"
$ReleaseDir = Join-Path $RootDir "src-tauri\target\release"

Write-Host "LevelUpAgent $Version Windows build"
Write-Host "Project: $RootDir"
Write-Host "Node.js: $NodeVersion"
Write-Host "pnpm: $PnpmVersion"
Write-Host "Cargo: $CargoVersion"
Write-Host "Bundle: $Bundle"

$env:npm_config_manage_package_manager_versions = "false"

if (-not $SkipInstall) {
    Invoke-BuildStep "Install dependencies" { & $Pnpm install --frozen-lockfile }
}

if (-not $SkipTests) {
    Invoke-BuildStep "Frontend and release checks" { & $Pnpm check }
    Invoke-BuildStep "Rust formatting check" { & $Cargo fmt --manifest-path src-tauri/Cargo.toml -- --check }
    Invoke-BuildStep "Rust tests" { & $Cargo test --manifest-path src-tauri/Cargo.toml }
}
else {
    Write-Host ""
    Write-Host "Skipping checks and tests (-SkipTests)." -ForegroundColor Yellow
}

if ($Bundle -eq "none") {
    Invoke-BuildStep "Build Windows executable" { & $Pnpm tauri build --no-bundle }
}
else {
    $BundleArgument = if ($Bundle -eq "all") { "nsis,msi" } else { $Bundle }
    Invoke-BuildStep "Build Windows $BundleArgument bundle" { & $Pnpm tauri build --bundles $BundleArgument }
}

if (Test-Path $OutputDir) {
    Remove-Item $OutputDir -Recurse -Force
}
New-Item $OutputDir -ItemType Directory -Force | Out-Null

$Artifacts = New-Object System.Collections.Generic.List[System.IO.FileInfo]
$Executable = Join-Path $ReleaseDir "levelup-agent.exe"
if (-not (Test-Path $Executable)) {
    throw "Build completed but the application executable was not found: $Executable"
}
$Artifacts.Add((Get-Item $Executable))

if ($Bundle -eq "nsis" -or $Bundle -eq "all") {
    $NsisArtifacts = @(
        Get-ChildItem (Join-Path $ReleaseDir "bundle\nsis") -Filter "LevelUpAgent_${Version}_*.exe" -File
    )
    if ($NsisArtifacts.Count -eq 0) {
        throw "NSIS build completed but no installer for version $Version was found."
    }
    $NsisArtifacts | ForEach-Object { $Artifacts.Add($_) }
}
if ($Bundle -eq "msi" -or $Bundle -eq "all") {
    $MsiArtifacts = @(
        Get-ChildItem (Join-Path $ReleaseDir "bundle\msi") -Filter "LevelUpAgent_${Version}_*.msi" -File
    )
    if ($MsiArtifacts.Count -eq 0) {
        throw "MSI build completed but no installer for version $Version was found."
    }
    $MsiArtifacts | ForEach-Object { $Artifacts.Add($_) }
}

if ($Artifacts.Count -lt 1) {
    throw "No Windows build artifacts were found."
}

$Copied = New-Object System.Collections.Generic.List[System.IO.FileInfo]
foreach ($Artifact in $Artifacts) {
    $Destination = Join-Path $OutputDir $Artifact.Name
    Copy-Item $Artifact.FullName $Destination -Force
    $Copied.Add((Get-Item $Destination))
}

$HashLines = foreach ($Artifact in $Copied) {
    $Hash = (Get-FileHash $Artifact.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$Hash  $($Artifact.Name)"
}
$HashPath = Join-Path $OutputDir "SHA256SUMS.txt"
$HashLines | Set-Content $HashPath -Encoding Ascii

Write-Host ""
Write-Host "Build completed successfully." -ForegroundColor Green
Write-Host "Artifacts: $OutputDir"
foreach ($Artifact in $Copied) {
    Write-Host "  $($Artifact.Name)"
}
Write-Host "  SHA256SUMS.txt"
