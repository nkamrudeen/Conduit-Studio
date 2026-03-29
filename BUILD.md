# Build Guide

Instructions for building AI-IDE for production and packaging it as an installable desktop application.

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

The FastAPI backend does not need to be "built" — it runs with uvicorn. For deployment, build a Docker image:

```bash
cd apps/backend

# Build the Docker image
docker build -t ai-ide-backend:latest .

# Run it
docker run -p 8000:8000 ai-ide-backend:latest
```

If there is no `Dockerfile` yet, create one:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install uv && uv sync --no-dev
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 3. Desktop App (Electron)

The Electron app wraps the web app and bundles the Python backend.

### Prerequisites

- All Node dependencies installed (`pnpm install` from repo root)
- Python 3.11 installed on the build machine
- uv installed

### Step-by-step

```bash
# Step 1: Build all packages and the web app
pnpm build

# Step 2: Build the Electron TypeScript
cd apps/desktop
pnpm build

# Step 3: Package the installer
pnpm dist
```

Installers are written to `apps/desktop/release/`:

| Platform | Output |
|---|---|
| Windows | `AI-IDE Setup x.x.x.exe` (NSIS installer) |
| macOS | `AI-IDE-x.x.x.dmg` |
| Linux | `AI-IDE-x.x.x.AppImage` |

### Platform-specific build notes

**Windows** — Run on Windows or use a Windows CI runner. Requires the Windows SDK for code signing (optional).

**macOS** — Run on macOS. For distribution outside the Mac App Store, set up an Apple Developer certificate and notarization:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your_password
export APPLE_ID=your@apple.id
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
pnpm dist
```

**Linux** — Run on any Linux x64 host. The AppImage is self-contained and runs on most distributions.

---

## 4. Full monorepo build

Builds all packages, the web app, and the Electron app in dependency order:

```bash
pnpm build
```

Turborepo caches outputs — subsequent builds are incremental.

---

## 5. Running E2E tests against the production build

```bash
# Start the production web server
cd apps/web && pnpm exec vite preview --port 3000 &

# Run Playwright tests
pnpm exec playwright test
```

---

## 6. Environment variables

Create `apps/backend/.env` for secrets used during execution:

```env
# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000

# AWS (for S3 connector)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1

# Azure
AZURE_STORAGE_CONNECTION_STRING=

# GCS
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# OpenAI / Anthropic (for LLM pipeline execution)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# HuggingFace
HUGGINGFACE_HUB_TOKEN=
```

The Electron desktop app reads these from the OS keychain via `safeStorage` when set through the Settings panel.
