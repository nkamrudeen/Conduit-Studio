# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI-IDE** is an open-source drag-and-drop visual IDE for MLOps and LLMOps. Users build pipelines as flowcharts; the IDE generates executable code from the visual flow. It is designed to be pluggable (VS Code-style plugin system) and targets both browser and Electron desktop deployment.

## Planned Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + React Flow v12 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Python 3.11 + FastAPI |
| Monorepo | Turborepo + pnpm |
| Desktop | Electron (wraps the web app) |
| Plugin system | manifest.json + iframe sandbox + postMessage API |
| Code generation | Jinja2 templates (Python-side) |
| License | Apache 2.0 |

## Monorepo Layout (planned)

```
ai-ide/
├── apps/
│   ├── web/          # React + Vite browser app
│   ├── desktop/      # Electron wrapper
│   └── backend/      # FastAPI server (execution engine, code generator, connectors)
├── packages/
│   ├── canvas-engine/    # React Flow canvas abstraction
│   ├── node-registry/    # All node type definitions (ML + LLM nodes)
│   ├── code-generator/   # DAG → Python/Notebook/Kubeflow/Dockerfile
│   ├── plugin-sdk/       # TypeScript SDK for plugin authors
│   ├── ui/               # Shared shadcn/ui component library
│   └── types/            # Shared TypeScript interfaces
├── plugins/              # Official bundled plugins
│   ├── connector-s3/
│   ├── connector-azure/
│   ├── connector-gcs/
│   └── llm-openai/
└── turbo.json
```

## Two Pipeline Modes

### ML Pipeline
Linear flow: **Data Ingestion → Extraction → Translation → Filtration → Split → Train → Evaluate → Deploy → Monitoring**

Supported frameworks per node category:
- **Train nodes**: scikit-learn, TensorFlow/Keras, PyTorch, PyTorch Lightning
- **Deploy nodes**: MLflow Model Registry, Kubeflow Serving, Docker, HuggingFace Hub
- **Monitoring nodes**: Evidently (data/model drift), performance dashboards, webhook alerts

### LLMOps Pipeline
Linear flow: **Data Ingestion → Chunking → Embedding → Vector Store → LLM → Chain/Agent → Evaluation → Deploy → Monitoring**

Supported frameworks:
- **LLM nodes**: OpenAI, Anthropic Claude, Ollama (local), vLLM, HuggingFace Inference
- **Chain nodes**: LangChain, LangGraph, LlamaIndex
- **Vector Store nodes**: FAISS, Chroma, Pinecone, Weaviate, pgvector

## Code Generation (core feature)

The visual flow is the **single source of truth**. Code is always generated from the flow (one-way).

The backend receives a pipeline DAG (JSON: nodes + edges + configs), performs topological sort, renders each node's Jinja2 template, and assembles output in four formats:
- `pipeline.py` — standalone executable Python script
- `pipeline.ipynb` — Jupyter notebook (one cell per node)
- `pipeline_kubeflow.py` — Kubeflow Pipelines v2 DSL + compiled YAML
- `Dockerfile` + `requirements.txt` — containerized version

## Plugin System

Plugins follow a manifest-first, iframe-sandbox model:
- Each plugin ships a `plugin.manifest.json` declaring name, version, category, and `nodeTypes[]`
- Plugins render UI inside sandboxed iframes; communicate with the host via `postMessage`
- Core postMessage message types: `REGISTER_NODE`, `NODE_EXECUTE`, `GET_CONFIG`, `SEND_DATA`
- Plugins are discovered from `~/.aiide/plugins/` at startup

## Node Type Contract

Every node (built-in or plugin) must declare:
- `id`, `category`, `label`, `icon`
- `inputs[]` and `outputs[]` with typed ports (`DataFrame`, `Model`, `Embeddings`, `Text`, `Metrics`, etc.)
- `configSchema` — JSON Schema rendered as a form in the Inspector panel
- `codeTemplate` — Jinja2 template used by the code generator

## MLOps Integrations

- **MLflow**: experiment tracking, model registry, artifact logging, serving
- **Kubeflow Pipelines**: pipeline submission, run management, Pipelines v2 DSL
- **HuggingFace Hub**: model/dataset download, model card, Inference API, Hub push

## Data Source Connectors (pluggable nodes)

Local filesystem, AWS S3 (boto3), Azure Blob Storage (azure-storage-blob), Google Cloud Storage (google-cloud-storage), PostgreSQL, MongoDB, BigQuery, Snowflake, REST API, HuggingFace Datasets.
