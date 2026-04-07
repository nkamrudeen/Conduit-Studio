# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ConduitCraft AI** is an open-source drag-and-drop visual IDE for MLOps and LLMOps. Users build pipelines as flowcharts; the IDE generates executable code from the visual flow. It is designed to be pluggable (VS Code-style plugin system) and targets both browser and Electron desktop deployment.

## Implemented Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + React Flow v12 + Vite + Tailwind CSS + shadcn/ui |
| State | Zustand + Immer |
| Backend | Python 3.11 + FastAPI + Jinja2 + cryptography + azure-ai-ml |
| Monorepo | Turborepo + pnpm |
| Desktop | Electron 33 (wraps the web app) + PyInstaller onedir bundle |
| Plugin system | manifest.json + iframe sandbox + postMessage API |
| Code generation | Jinja2 templates (Python-side) |
| License | Apache 2.0 |

## Monorepo Layout

```
ai-ide/
├── apps/
│   ├── web/          # React + Vite browser app
│   ├── desktop/      # Electron wrapper + PyInstaller backend
│   └── backend/      # FastAPI server
│       └── app/
│           ├── routers/
│           │   ├── pipeline.py      # run, status, estimate, check-deps
│           │   ├── codegen.py       # generate, model-card
│           │   ├── connectors.py
│           │   ├── files.py
│           │   ├── project.py
│           │   ├── integrations.py
│           │   ├── mlflow.py
│           │   ├── kubeflow.py
│           │   ├── huggingface.py
│           │   ├── plugins.py
│           │   ├── analyze.py
│           │   ├── vault.py         # Secrets Vault CRUD
│           │   ├── history.py       # Pipeline snapshot store
│           │   ├── debug.py         # RAG retrieval debugger
│           │   ├── cloud_deploy.py  # Azure ML jobs + endpoints
│           │   ├── playground.py    # Prompt streaming + versioning
│           │   └── experiments.py   # Leaderboard / run comparison
│           └── services/
│               ├── codegen/
│               │   ├── engine.py
│               │   ├── python_gen.py
│               │   ├── notebook_gen.py
│               │   ├── kubeflow_gen.py
│               │   ├── docker_gen.py
│               │   ├── package_gen.py
│               │   └── model_card_gen.py
│               ├── connectors/
│               ├── integrations/
│               ├── vault.py              # AES-256 Fernet encryption
│               ├── pipeline_history.py   # SQLite snapshots (7d, 200-cap)
│               ├── retrieval_debug.py    # RAG trace engine
│               ├── azure_ml.py           # azure-ai-ml SDK client
│               ├── playground.py         # LLM streaming + prompt versioning
│               ├── cost_estimator.py     # Token count + pricing lookup
│               ├── dep_checker.py        # Pip conflict resolver
│               └── experiment_store.py   # MLflow adapter + SQLite fallback
├── packages/
│   ├── canvas-engine/    # React Flow canvas abstraction
│   ├── node-registry/    # All built-in node definitions (ML + LLM + Split)
│   ├── plugin-sdk/       # TypeScript SDK for plugin authors
│   ├── ui/               # Shared shadcn/ui component library
│   └── types/            # Shared TypeScript interfaces
├── plugins/              # Official bundled plugins
└── turbo.json
```

## Two Pipeline Modes

### ML Pipeline
Linear flow: **Data Ingestion → Transform → [A/B Split] → Train → Evaluate → Deploy → Monitoring**

Supported frameworks per node category:
- **Train nodes**: scikit-learn, TensorFlow/Keras, PyTorch, PyTorch Lightning
- **Deploy nodes**: MLflow Model Registry, Kubeflow Serving, Docker, HuggingFace Hub, Azure ML endpoint
- **Monitoring nodes**: Evidently (data/model drift), performance dashboards, webhook alerts
- **Split nodes**: `ml.split.ab` — A/B fork with random/first-N/stratified strategies

### LLMOps Pipeline
Linear flow: **Data Ingestion → Chunking → Embedding → Vector Store → LLM → Chain/Agent → [A/B Split] → Deploy → Monitoring**

Supported frameworks:
- **LLM nodes**: OpenAI, Anthropic Claude, Ollama (local), vLLM, HuggingFace Inference
- **Chain nodes**: LangChain, LangGraph, LlamaIndex
- **Vector Store nodes**: FAISS, Chroma, Pinecone, Weaviate, pgvector
- **Split nodes**: `llm.split.ab` — A/B document/prompt fork

## Node Type Contract

Every node (built-in or plugin) must declare:
- `id`, `category`, `label`, `icon`, `color`
- `inputs[]` and `outputs[]` with typed ports (`DataFrame`, `Model`, `Embeddings`, `VectorStore`, `Text`, `Metrics`, `Any`)
- `configSchema` — JSON Schema rendered as a form in the Inspector panel
- `codeTemplateId` — Jinja2 template filename in `backend/app/templates/`
- `requiredPackages` — pip packages for generated code
- `supportsPlayground?: boolean` — shows Playground tab in Inspector (LLM/chain nodes)
- `supportsDebug?: boolean` — shows Debug tab in Inspector (RAG chain nodes)
- `disabled?: boolean` — hides node from palette (WIP nodes)

## Code Generation

The visual flow is the **single source of truth**. Code is always generated from the flow (one-way).

The backend receives a pipeline DAG (JSON: nodes + edges + configs), performs topological sort, renders each node's Jinja2 template, and assembles output in four formats:
- `pipeline.py` — standalone executable Python script
- `pipeline.ipynb` — Jupyter notebook (one cell per node)
- `pipeline_kubeflow.py` — Kubeflow Pipelines v2 DSL + compiled YAML
- `Dockerfile` + `requirements.txt` — containerized version
- Package layout — installable Python package (`src/<slug>/pipeline.py` + `pyproject.toml`)
- Model Card — HuggingFace-format `MODEL_CARD.md` (from Deploy nodes)

Secret references in node configs render as `os.environ["KEY"]` in generated code.

## Secrets Vault *(development branch — not yet in main)*

- Backend: `apps/backend/app/services/vault.py` — AES-256 Fernet; `.secrets.json` + `.vault.key` in project folder
- Router: `apps/backend/app/routers/vault.py` — `POST /vault/list|set|delete`
- Frontend: `apps/web/src/features/settings/SecretsPanel.tsx` — in Settings → Secrets tab
- Integrations panel: all `type: 'password'` fields use `VaultField` component — stores to vault, never localStorage

## Pipeline History *(development branch — not yet in main)*

- Backend: `apps/backend/app/services/pipeline_history.py` — SQLite `.pipeline_history.db`, 7-day/200-snapshot retention
- Router: `apps/backend/app/routers/history.py` — `POST /history/save|list|get|diff`
- Frontend: `apps/web/src/features/canvas/PipelineDiffView.tsx` — modal diff viewer; `CanvasPage.tsx` auto-saves every 30s

## Cloud Deployment *(development branch — not yet in main)*

- Backend: `apps/backend/app/services/azure_ml.py` + `apps/backend/app/routers/cloud_deploy.py`
- Frontend: `apps/web/src/features/cloud-deploy/CloudDeployPanel.tsx`
- Toolbar: Cloud icon (upload-cloud) in `IDELayout.tsx` toggles the panel (`sidePanel === 'cloud-deploy'`)
- Azure ML: `ClientSecretCredential` (service principal) or `DefaultAzureCredential`
- AWS SageMaker / GCP Vertex AI: tabs present but disabled (coming soon)

## Integrations Credentials

All Integrations panel password/token fields use `VaultField` — values stored in the Secrets Vault, not localStorage. The vault stores only ciphertext; the `list` endpoint returns names only (not values).

## Plugin System

Plugins follow a manifest-first, iframe-sandbox model:
- Each plugin ships a `plugin.manifest.json` declaring name, version, category, and `nodeTypes[]`
- Plugins render UI inside sandboxed iframes; communicate with the host via `postMessage`
- Core postMessage message types: `REGISTER_NODE`, `NODE_EXECUTE`, `GET_CONFIG`, `SEND_DATA`
- Plugins are discovered from `~/.conduitcraft/plugins/` at startup

## MLOps Integrations

- **MLflow**: experiment tracking, model registry, artifact logging, serving
- **Kubeflow Pipelines**: pipeline submission, run management, Pipelines v2 DSL
- **HuggingFace Hub**: model/dataset download, model card, Inference API, Hub push
- **Azure ML**: pipeline job submission, real-time endpoint deployment

## Data Source Connectors (pluggable nodes)

Local filesystem, AWS S3 (boto3), Azure Blob Storage (azure-storage-blob), Google Cloud Storage (google-cloud-storage), PostgreSQL, MongoDB, BigQuery, Snowflake, REST API, HuggingFace Datasets.

## Key TypeScript Notes

- `exactOptionalPropertyTypes: true` — optional props need `?? fallback` at call sites
- `usePipelineStore` exposes `s.dag` (not `s.id`, `s.name` directly at top level)
- `SidePanel` type in `IDELayout`: `'integrations' | 'settings' | 'files' | 'cloud-deploy' | null`
- Node Inspector tab type: `'config' | 'playground' | 'debug'`
