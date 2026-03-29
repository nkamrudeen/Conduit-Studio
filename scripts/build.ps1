# =============================================================================
# AI-IDE Build Script (Windows PowerShell)
# Builds the web app, backend, and optionally the desktop Electron installer.
#
# Usage:
#   .\scripts\build.ps1                  # web + backend check
#   .\scripts\build.ps1 -Desktop         # + Electron installer
#   .\scripts\build.ps1 -WebOnly         # web app only
#   .\scripts\build.ps1 -SkipChecks      # skip prerequisite checks
# =============================================================================

param(
    [switch]$Desktop,
    [switch]$WebOnly,
    [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

function Info    { param($msg) Write-Host "[build] $msg" -ForegroundColor Cyan }
function Success { param($msg) Write-Host "[build] ✓ $msg" -ForegroundColor Green }
function Warn    { param($msg) Write-Host "[build] ⚠ $msg" -ForegroundColor Yellow }
function Err     { param($msg) Write-Host "[build] ✗ $msg" -ForegroundColor Red; exit 1 }

# ── Prerequisite checks ───────────────────────────────────────────────────────
if (-not $SkipChecks) {
    Info "Checking prerequisites…"

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Err "Node.js not found. Install Node ≥ 20 from https://nodejs.org" }
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Err "pnpm not found. Run: npm install -g pnpm" }
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) { Err "Python not found. Install Python ≥ 3.11 from https://python.org" }

    $nodeVersion = (node --version).TrimStart('v')
    $nodeMajor   = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 20) { Err "Node.js $nodeVersion found but ≥ 20 is required." }

    Success "Prerequisites OK (Node $nodeVersion)"
}

# ── Step 1: Install dependencies ──────────────────────────────────────────────
Info "Installing Node dependencies…"
Set-Location $RepoRoot
pnpm install --frozen-lockfile
Success "Node dependencies installed"

# ── Step 2: Build shared packages ─────────────────────────────────────────────
Info "Building shared packages…"
pnpm build --filter=@ai-ide/types `
           --filter=@ai-ide/ui `
           --filter=@ai-ide/node-registry `
           --filter=@ai-ide/canvas-engine `
           --filter=@ai-ide/plugin-sdk
Success "Packages built"

# ── Step 3: Build web app ─────────────────────────────────────────────────────
Info "Building web app…"
pnpm build --filter=@ai-ide/web
Success "Web app built → apps\web\dist\"

if ($WebOnly) {
    Success "Web-only build complete."
    exit 0
}

# ── Step 4: Check backend ─────────────────────────────────────────────────────
Info "Checking backend Python syntax…"
Set-Location "$RepoRoot\apps\backend"
if (Get-Command uv -ErrorAction SilentlyContinue) {
    uv run python -m py_compile app/main.py
    Success "Backend syntax OK"
} else {
    Warn "uv not found — skipping backend check. Install: https://astral.sh/uv"
}
Set-Location $RepoRoot

# ── Step 5: Desktop installer (optional) ─────────────────────────────────────
if ($Desktop) {
    Info "Building Electron desktop installer…"
    Set-Location "$RepoRoot\apps\desktop"

    # Compile TypeScript
    pnpm build

    # Copy web dist for bundling
    New-Item -ItemType Directory -Force -Path "dist-web" | Out-Null
    Copy-Item -Recurse -Force "$RepoRoot\apps\web\dist\*" "dist-web\"

    # Create installer
    pnpm exec electron-builder --publish never
    Success "Desktop installer → apps\desktop\release\"
    Set-Location $RepoRoot
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════" -ForegroundColor Green
Write-Host "  Build complete!" -ForegroundColor Green
Write-Host "══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Web app:   apps\web\dist\"
if ($Desktop) { Write-Host "  Desktop:   apps\desktop\release\" }
Write-Host ""
Write-Host "  To preview the web build:"
Write-Host "    cd apps\web && pnpm exec vite preview --port 3000"
Write-Host ""
Write-Host "  To start the backend:"
Write-Host "    cd apps\backend && uv run uvicorn app.main:app --port 8000"
Write-Host ""
