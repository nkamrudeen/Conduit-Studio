#!/usr/bin/env bash
# =============================================================================
# AI-IDE Build Script
# Builds the web app, backend Docker image, and optionally the desktop app.
#
# Usage:
#   ./scripts/build.sh                 # web + backend
#   ./scripts/build.sh --desktop       # web + backend + Electron installer
#   ./scripts/build.sh --web-only      # web app only
#   ./scripts/build.sh --skip-checks   # skip prerequisite checks
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DESKTOP=false
WEB_ONLY=false
SKIP_CHECKS=false

# ── Parse arguments ───────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --desktop)      BUILD_DESKTOP=true ;;
    --web-only)     WEB_ONLY=true ;;
    --skip-checks)  SKIP_CHECKS=true ;;
    -h|--help)
      sed -n '/^# Usage/,/^# ====/p' "$0" | head -8
      exit 0
      ;;
  esac
done

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()    { echo -e "${CYAN}[build]${NC} $*"; }
success() { echo -e "${GREEN}[build]${NC} ✓ $*"; }
warn()    { echo -e "${YELLOW}[build]${NC} ⚠ $*"; }
error()   { echo -e "${RED}[build]${NC} ✗ $*"; exit 1; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
if [[ "$SKIP_CHECKS" == false ]]; then
  info "Checking prerequisites…"

  command -v node  >/dev/null 2>&1 || error "Node.js not found. Install Node ≥ 20."
  command -v pnpm  >/dev/null 2>&1 || error "pnpm not found. Run: npm install -g pnpm"
  command -v python3 >/dev/null 2>&1 || error "Python 3 not found. Install Python ≥ 3.11."

  NODE_VERSION=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [[ $NODE_MAJOR -lt 20 ]]; then
    error "Node.js $NODE_VERSION found but ≥ 20 is required."
  fi

  if $BUILD_DESKTOP; then
    command -v electron-builder >/dev/null 2>&1 || \
      warn "electron-builder not found globally — will use local pnpm exec."
  fi

  success "Prerequisites OK (Node $NODE_VERSION)"
fi

# ── Step 1: Install dependencies ──────────────────────────────────────────────
info "Installing Node dependencies…"
cd "$REPO_ROOT"
pnpm install --frozen-lockfile
success "Node dependencies installed"

# ── Step 2: Build all TypeScript packages ─────────────────────────────────────
info "Building shared packages (types, ui, node-registry, canvas-engine, plugin-sdk)…"
pnpm build --filter=@ai-ide/types \
           --filter=@ai-ide/ui \
           --filter=@ai-ide/node-registry \
           --filter=@ai-ide/canvas-engine \
           --filter=@ai-ide/plugin-sdk
success "Packages built"

# ── Step 3: Build web app ─────────────────────────────────────────────────────
info "Building web app…"
pnpm build --filter=@ai-ide/web
success "Web app built → apps/web/dist/"

if [[ "$WEB_ONLY" == true ]]; then
  success "Web-only build complete."
  exit 0
fi

# ── Step 4: Type-check backend ────────────────────────────────────────────────
info "Checking backend (Python syntax)…"
cd "$REPO_ROOT/apps/backend"
if command -v uv >/dev/null 2>&1; then
  uv run python -m py_compile app/main.py && success "Backend syntax OK"
else
  warn "uv not found — skipping backend check. Install: https://astral.sh/uv"
fi
cd "$REPO_ROOT"

# ── Step 5: Desktop app (optional) ───────────────────────────────────────────
if [[ "$BUILD_DESKTOP" == true ]]; then
  info "Building Electron desktop app…"
  cd "$REPO_ROOT/apps/desktop"

  # TypeScript compile
  pnpm build

  # Copy web dist into desktop (electron-builder reads it)
  mkdir -p dist-web
  cp -r "$REPO_ROOT/apps/web/dist/." dist-web/

  # Package installer
  pnpm exec electron-builder --publish never
  success "Desktop installer → apps/desktop/release/"
  cd "$REPO_ROOT"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  Build complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "  Web app:   apps/web/dist/"
if [[ "$BUILD_DESKTOP" == true ]]; then
echo "  Desktop:   apps/desktop/release/"
fi
echo ""
echo "  To preview the web build:"
echo "    cd apps/web && pnpm exec vite preview --port 3000"
echo ""
echo "  To start the backend:"
echo "    cd apps/backend && uv run uvicorn app.main:app --port 8000"
echo ""
