Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# free-code Windows installer
# Usage:
#   irm https://raw.githubusercontent.com/phucnvan/free-code/main/install.ps1 | iex

$script:RepoUrl = "https://github.com/phucnvan/free-code.git"
$script:InstallDir = Join-Path $HOME "free-code"
$script:BunMinVersion = "1.3.11"
$script:LinkDir = Join-Path $HOME ".local\bin"

function Write-Info([string] $Message) {
  Write-Host "[*] $Message" -ForegroundColor Cyan
}

function Write-Ok([string] $Message) {
  Write-Host "[+] $Message" -ForegroundColor Green
}

function Write-Warn([string] $Message) {
  Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Fail([string] $Message) {
  Write-Host "[x] $Message" -ForegroundColor Red
  exit 1
}

function Show-Header() {
  Write-Host ""
  Write-Host "   ___                            _" -ForegroundColor Cyan
  Write-Host "  / _|_ __ ___  ___        ___ __| | ___" -ForegroundColor Cyan
  Write-Host " | |_| '__/ _ \/ _ \_____ / __/ _` |/ _ \" -ForegroundColor Cyan
  Write-Host " |  _| | |  __/  __/_____| (_| (_| |  __/" -ForegroundColor Cyan
  Write-Host " |_| |_|  \___|\___|      \___\__,_|\___|" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  The free build of Claude Code" -ForegroundColor DarkGray
  Write-Host ""
}

function Normalize-Version([string] $Version) {
  $parts = $Version.Split(".")
  while ($parts.Count -lt 4) {
    $parts += "0"
  }
  return [version]($parts[0..3] -join ".")
}

function Test-VersionGte([string] $Current, [string] $Minimum) {
  return (Normalize-Version $Current) -ge (Normalize-Version $Minimum)
}

function Check-OS() {
  if (-not $IsWindows) {
    Fail "This installer is for Windows PowerShell only."
  }
  Write-Ok "OS: Windows"
}

function Check-Git() {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) {
    Fail "git is not installed. Install Git for Windows first: https://git-scm.com/download/win"
  }
  Write-Ok "git: $(& git --version)"
}

function Ensure-Bun-OnPath() {
  $bunBin = Join-Path $HOME ".bun\bin"
  if (Test-Path $bunBin) {
    if (-not (($env:PATH -split ";") -contains $bunBin)) {
      $env:PATH = "$bunBin;$env:PATH"
    }
  }
}

function Install-Bun() {
  Write-Info "Installing Bun..."
  powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
  Ensure-Bun-OnPath
  $bun = Get-Command bun -ErrorAction SilentlyContinue
  if (-not $bun) {
    Fail "Bun installation succeeded but bun is not on PATH. Restart PowerShell, then run the installer again."
  }
  Write-Ok "bun: v$(& bun --version) (just installed)"
}

function Check-Bun() {
  Ensure-Bun-OnPath
  $bun = Get-Command bun -ErrorAction SilentlyContinue
  if ($bun) {
    $version = (& bun --version).Trim()
    if (Test-VersionGte $version $script:BunMinVersion) {
      Write-Ok "bun: v$version"
      return
    }
    Write-Warn "bun v$version found but v$script:BunMinVersion+ required. Upgrading..."
  } else {
    Write-Info "bun not found. Installing..."
  }
  Install-Bun
}

function Clone-Repo() {
  if (Test-Path $script:InstallDir) {
    Write-Warn "$script:InstallDir already exists"
    $gitDir = Join-Path $script:InstallDir ".git"
    if (Test-Path $gitDir) {
      Write-Info "Pulling latest changes..."
      try {
        & git -C $script:InstallDir pull --ff-only origin main | Out-Host
      } catch {
        Write-Warn "Pull failed, continuing with existing copy"
      }
    }
  } else {
    Write-Info "Cloning repository..."
    & git clone --depth 1 $script:RepoUrl $script:InstallDir
  }
  Write-Ok "Source: $script:InstallDir"
}

function Install-Deps() {
  Write-Info "Installing dependencies..."
  Push-Location $script:InstallDir
  try {
    & bun install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
      & bun install
      if ($LASTEXITCODE -ne 0) {
        Fail "bun install failed"
      }
    }
  } finally {
    Pop-Location
  }
  Write-Ok "Dependencies installed"
}

function Build-Binary() {
  Write-Info "Building free-code (all experimental features enabled)..."
  Push-Location $script:InstallDir
  try {
    & bun run build:dev:full
    if ($LASTEXITCODE -ne 0) {
      Fail "bun run build:dev:full failed"
    }
  } finally {
    Pop-Location
  }
  Write-Ok "Binary built"
}

function Resolve-BinaryPath() {
  $candidates = @(
    (Join-Path $script:InstallDir "cli-dev.exe"),
    (Join-Path $script:InstallDir "cli-dev"),
    (Join-Path $script:InstallDir "dist\cli-dev.exe"),
    (Join-Path $script:InstallDir "dist\cli-dev")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  Fail "Built binary not found under $script:InstallDir"
}

function Link-Binary() {
  $binaryPath = Resolve-BinaryPath
  New-Item -ItemType Directory -Force -Path $script:LinkDir | Out-Null

  $cmdPath = Join-Path $script:LinkDir "free-code.cmd"
  $ps1Path = Join-Path $script:LinkDir "free-code.ps1"

  @(
    "@echo off",
    "`"$binaryPath`" %*"
  ) | Set-Content -Path $cmdPath -Encoding ASCII

  @(
    '$ErrorActionPreference = "Stop"',
    "& `"$binaryPath`" @args"
  ) | Set-Content -Path $ps1Path -Encoding ASCII

  Write-Ok "Launchers created:"
  Write-Host "    $cmdPath"
  Write-Host "    $ps1Path"

  if (-not (($env:PATH -split ";") -contains $script:LinkDir)) {
    Write-Warn "$script:LinkDir is not on your PATH"
    Write-Host ""
    Write-Host "  Add this for the current session:" -ForegroundColor Yellow
    Write-Host "    `$env:PATH = `"$script:LinkDir;`$env:PATH`""
    Write-Host ""
    Write-Host "  Or add it permanently in Environment Variables." -ForegroundColor Yellow
    Write-Host ""
  }
}

Show-Header
Write-Info "Starting installation..."
Write-Host ""

Check-OS
Check-Git
Check-Bun
Write-Host ""

Clone-Repo
Install-Deps
Build-Binary
Link-Binary

$binaryPath = Resolve-BinaryPath

Write-Host ""
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Run it:"
Write-Host "    free-code"
Write-Host "    free-code -p `"your prompt`""
Write-Host ""
Write-Host "  Set your API key:"
Write-Host '    $env:ANTHROPIC_API_KEY="sk-ant-..."'
Write-Host ""
Write-Host "  Or log in with Claude.ai:"
Write-Host "    free-code /login"
Write-Host ""
Write-Host "  Source: $script:InstallDir" -ForegroundColor DarkGray
Write-Host "  Binary: $binaryPath" -ForegroundColor DarkGray
Write-Host "  Link dir: $script:LinkDir" -ForegroundColor DarkGray
Write-Host ""
