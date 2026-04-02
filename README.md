# ConduitCraft AI

<p align="center">
  <img src="apps/web/public/logo-large.svg" width="480" alt="ConduitCraft AI — Craft Your Pipelines. Ship Your Models." />
</p>

<p align="center">
  <strong>Craft Your Pipelines. Ship Your Models.</strong><br/>
  Open-source drag-and-drop IDE for building ML and LLM pipelines.<br/>
  Compose pipelines as flowcharts — ConduitCraft AI generates executable Python scripts,<br/>
  Jupyter notebooks, Kubeflow DSL, and Dockerfiles from the visual flow.
</p>

<p align="center">
  <img src="docs/demo.gif" width="960" alt="ConduitCraft AI — live demo" />
</p>

---

## Features

- **Visual pipeline builder** — drag nodes onto a canvas, connect them with typed edges
- **Dual pipeline modes** — ML Pipeline (scikit-learn, Keras, PyTorch, XGBoost) and LLM Pipeline (LangChain, OpenAI, Anthropic Claude, Ollama, Pinecone)
- **Code generation** — one click produces Python scripts, Jupyter notebooks, Kubeflow DSL, or Dockerfiles; save directly to your project folder
- **Package layout** — Python output can be structured as an installable package (`src/<slug>/pipeline.py` + `pyproject.toml`)
- **Inline data preview** — after a run, each node shows its output on the canvas: DataFrame shape + mini table, model class name, metrics, text
- **Port type validation** — incompatible connections are blocked at draw time; the Validate button scans the whole pipeline
- **Data connectors** — local files, AWS S3, Azure Blob, GCS, PostgreSQL, HuggingFace Datasets (with streaming preview)
- **File upload** — upload CSV/Parquet files through the UI; files are stored server-side and bundled in Docker builds
- **File browser** — browse and manage files in the current project folder
- **MLOps integrations** — MLflow, Kubeflow Pipelines (OAuth2 + token auth), HuggingFace Hub; all with Test Connection
- **Plugin system** — community plugins add new node types via an iframe sandbox and `postMessage` API
- **Pipeline execution** — run locally or inside Docker with real-time WebSocket log streaming and per-node status indicators
- **Sample pipelines** — 10 pre-built ML and LLM templates to get started instantly
- **AI assistant** — built-in agent suggests next nodes and improvements
- **Desktop app** — Electron wrapper with a bundled FastAPI backend (PyInstaller) for Windows, macOS, and Linux — no Python installation required

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| Python | ≥ 3.11 |
| uv | latest |

Install uv:
```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Installation

```bash
git clone https://github.com/conduitcraft-ai/conduitcraft-ai.git
cd conduitcraft-ai

# Install Node dependencies
pnpm install

# Install Python dependencies
cd apps/backend
uv sync
cd ../..
```

### Running in Development

Open two terminals:

**Terminal 1 — Frontend**
```bash
pnpm dev:web
# → http://localhost:3000
```

**Terminal 2 — Backend**
```bash
cd apps/backend
uv run uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
```

Open **http://localhost:3000** in your browser.

> The backend is required for **code generation**, **pipeline execution**, **file uploads**, and **data previews**. The visual canvas and sample pipelines work without it.

---

## Project Structure

```
conduitcraft-ai/
├── apps/
│   ├── web/          # React 18 + Vite browser app (port 3000)
│   ├── desktop/      # Electron wrapper + PyInstaller bundled backend
│   └── backend/      # FastAPI execution engine + code generator (port 8000)
│       ├── app/
│       │   ├── routers/          # pipeline, codegen, connectors, files, integrations, …
│       │   ├── services/
│       │   │   ├── codegen/      # Python / Notebook / Kubeflow / Docker / Package gen
│       │   │   ├── connectors/   # local, S3, Azure, GCS, Postgres, HuggingFace
│       │   │   └── integrations/ # MLflow, Kubeflow, HuggingFace clients
│       │   └── models/
│       ├── conduit-backend.spec  # PyInstaller bundle spec
│       └── startup.py            # Uvicorn entry point (with startup logging)
├── packages/
│   ├── canvas-engine/    # React Flow canvas + Zustand store + port validation
│   ├── node-registry/    # All built-in node definitions (ML + LLM)
│   ├── plugin-sdk/       # SDK for building community plugins
│   ├── types/            # Shared TypeScript interfaces (PipelineNode, NodeResult, …)
│   └── ui/               # Shared shadcn/ui component library
└── plugins/              # Official bundled plugins
```

---

## Pipeline Modes

### ML Pipeline
```
Data Ingestion → Transform → Train → Evaluate → Deploy → Monitor
```
Frameworks: scikit-learn · XGBoost · Keras/TensorFlow · PyTorch  
MLOps: MLflow experiment tracking · Kubeflow Pipelines · HuggingFace Hub

### LLM Pipeline
```
Ingest → Chunk → Embed → VectorStore → LLM → Chain/Agent → Deploy → Monitor
```
LLMs: OpenAI · Anthropic Claude · Ollama · vLLM  
Chains: LangChain · LangGraph · LlamaIndex  
Vector stores: Chroma · FAISS · Pinecone · Weaviate · pgvector

---

## Code Generation

The visual flow is the **single source of truth**. The backend receives the pipeline DAG, performs a topological sort, renders Jinja2 templates per node, and assembles four output formats:

| Format | Output |
|---|---|
| **Python Script** | `pipeline.py` — standalone executable |
| **Notebook** | `pipeline.ipynb` — one cell per node |
| **Kubeflow DSL** | `pipeline_kubeflow.py` + compiled YAML |
| **Dockerfile** | `Dockerfile` + `requirements.txt` |

Use **Package Layout** (Python tab) to generate an installable Python package (`src/<slug>/pipeline.py`, `__init__.py`, `pyproject.toml`).

Use **Save to Project Folder** to write the active format directly to disk alongside your other project files.

---

## Inline Data Preview (Phase 8)

After a pipeline run, each node automatically shows its output directly on the canvas card — no Jupyter context-switch needed:

- **DataFrame** → shape badge (`1000 × 5`) + scrollable mini-table (first 3 rows, 4 columns)
- **Model** → class name badge (e.g., `🤖 RandomForestClassifier`)
- **Metrics** → key/value list with green values
- **Text / Number** → truncated inline display

The full output (5 rows × 6 columns, dtypes, duration) is also shown in the **Node Inspector** panel when the node is selected.

---

## Building for Desktop

```bash
# 1. Build the PyInstaller backend bundle (from apps/backend/)
cd apps/backend
pyinstaller conduit-backend.spec --clean

# 2. Package the Electron installer (from apps/desktop/)
cd ../desktop
pnpm dist
```

If the packaged app fails to start, check `<install-dir>/backend/conduit-backend.log` for the Python startup traceback.

See [BUILD.md](BUILD.md) for full instructions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, React Flow v12, Vite, Tailwind CSS, shadcn/ui |
| State | Zustand + Immer |
| Backend | Python 3.11, FastAPI, uvicorn, Jinja2, datasets, huggingface-hub |
| Desktop | Electron 33, PyInstaller (onedir bundle) |
| Monorepo | Turborepo + pnpm workspaces |

---

## Integrations

All integrations are configured in the **Integrations panel** (branching icon, top-right). Each has a **Test Connection** button.

| Service | Auth | Notes |
|---|---|---|
| **MLflow** | Tracking URI | Pre-fills `http://localhost:5000` |
| **Kubeflow Pipelines** | Host + token | Detects OAuth2 proxy; accepts `authservice_session` cookie value |
| **HuggingFace Hub** | Access token (`hf_…`) | Token forwarded in dataset/model search |
| **OpenAI** | API key | Pre-fills base URL |
| **Anthropic** | API key | |
| **AWS S3** | Access key + secret | Pre-fills `us-east-1` |

Credentials are stored in `localStorage`. For production, inject them as environment variables.

---

## Plugin System

Plugins live in `~/.conduitcraft/plugins/`. Each plugin ships a `plugin.manifest.json`:

```json
{
  "id": "com.example.my-connector",
  "name": "My Connector",
  "version": "1.0.0",
  "nodeTypes": ["my.ingest.source"],
  "permissions": ["network", "credentials"],
  "apiVersion": "1"
}
```

Plugins render UI inside sandboxed iframes and communicate with the host via `postMessage` (`REGISTER_NODE`, `NODE_EXECUTE`, `GET_CONFIG`, `SEND_DATA`).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Submit a pull request

## License

Apache 2.0 — see [LICENSE](LICENSE).
