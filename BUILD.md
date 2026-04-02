# Build Guide

Instructions for building ConduitCraft AI for production and packaging it as an installable desktop application.

---

## 1. Web App (browser build)

Produces a static bundle in `apps/web/dist/`.

```bash
# From the repo root
pnpm build --filter=@ai-ide/web

# Output: apps/web/dist/
```

To preview the production build locally:
```bash
cd apps/web
pnpm exec vite preview --port 4000
```

---

## 2. Backend (Python)

### Development server

```bash
cd apps/backend
uv run uvicorn app.main:app --reload --port 8000
```

### Docker image

```bash
cd apps/backend
docker build -t conduitcraft-backend:latest .
docker run -p 8000:8000 conduitcraft-backend:latest
```

Sample `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install uv && uv sync --no-dev
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### PyInstaller bundle (for Electron desktop)

The `conduit-backend.spec` bundles the entire FastAPI server into a single self-contained executable — no Python installation required on the end-user machine.

```bash
cd apps/backend

# First time: install PyInstaller
uv add --dev pyinstaller

# Build the bundle
pyinstaller conduit-backend.spec --clean

# Output: dist/conduit-backend/ (onedir — exe + all deps)
```

**Startup log:** When the bundled exe runs, it writes `conduit-backend.log` next to the executable. Check this file if the desktop app fails to start — it captures the Python version, import errors, and the full traceback.

**Adding new routers/services:** If you add a new Python module that FastAPI loads dynamically (via `include_router` or `importlib`), add it to `hidden_imports` in `conduit-backend.spec` and rebuild.

---

## 3. Desktop App (Electron)

The Electron app serves the web build via a local HTTP server (random port on `127.0.0.1`) and starts the PyInstaller backend bundle automatically.

### Prerequisites

- All Node dependencies installed (`pnpm install` from repo root)
- PyInstaller bundle already built (`apps/backend/dist/conduit-backend/` exists)
- Python 3.11 and uv installed on the build machine

### Step-by-step

```bash
# Step 1: Build all packages + the web app
pnpm build

# Step 2: Build the PyInstaller backend bundle
cd apps/backend
pyinstaller conduit-backend.spec --clean
cd ../..

# Step 3: Build the Electron TypeScript
cd apps/desktop
pnpm build

# Step 4: Package the installer
pnpm dist
```

Installers are written to `apps/desktop/release/`:

| Platform | Output |
|---|---|
| Windows | `ConduitCraft AI Setup x.x.x.exe` (NSIS installer) |
| macOS | `ConduitCraft AI-x.x.x.dmg` |
| Linux | `ConduitCraft AI-x.x.x.AppImage` |

### How the desktop app works

1. Electron starts and shows a splash screen immediately
2. The backend exe is spawned from `resources/backend/conduit-backend[.exe]`
3. Electron polls `http://127.0.0.1:8000/health` every 500ms (60s timeout)
4. The web app is served from a local HTTP server on a random port (`127.0.0.1:<port>`)
5. Once the backend is healthy, the web app loads in the BrowserWindow

If the backend fails to start, the error screen shows:
- Last 50 lines of captured stdout/stderr + `conduit-backend.log` content
- Whether the exe was found at the expected path
- Step-by-step rebuild instructions if the exe is missing
- **Retry** and **Copy Logs** buttons

### Platform-specific notes

**Windows** — Run on Windows or a Windows CI runner. Requires the Windows SDK for code signing (optional).

**macOS** — Run on macOS. For distribution outside the Mac App Store:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your@apple.id
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
pnpm dist
```

**Linux** — Run on any Linux x64 host. The AppImage is self-contained.

---

## 4. Full monorepo build

Builds all packages, the web app, and Electron in dependency order:

```bash
pnpm build
```

Turborepo caches outputs — subsequent builds are incremental.

---

## 5. Running E2E tests

```bash
# Start the production web server
cd apps/web && pnpm exec vite preview --port 3000 &

# Run Playwright tests
pnpm exec playwright test
```

---

## 6. Environment variables

Create `apps/backend/.env` for secrets:

```env
# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000

# AWS S3 connector
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1

# Azure Blob connector
AZURE_STORAGE_CONNECTION_STRING=

# GCS connector
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# HuggingFace
HF_TOKEN=
```

Credentials configured in the **Integrations panel** (UI) are stored in `localStorage` and injected as environment variables at pipeline run time — they do not need to be in `.env` unless you are running the backend directly without the UI.

---

## 7. Uploaded files

User-uploaded files (CSV, Parquet, etc.) are stored in `apps/backend/uploads/`. This directory is git-ignored and is created automatically at runtime.

In the packaged Electron app, uploads are stored next to the backend executable (writable location) rather than inside the read-only PyInstaller bundle.
