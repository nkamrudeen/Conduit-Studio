# ConduitCraft AI — User Guide

*Craft Your Pipelines. Ship Your Models.*

This guide walks you through every feature of ConduitCraft AI from first launch to running and exporting a full pipeline.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The IDE Layout](#2-the-ide-layout)
3. [Building a Pipeline](#3-building-a-pipeline)
4. [Configuring Nodes](#4-configuring-nodes)
5. [Connecting Nodes](#5-connecting-nodes)
6. [Data Connectors — Test & Preview](#6-data-connectors--test--preview)
7. [File Upload](#7-file-upload)
8. [File Browser](#8-file-browser)
9. [Generating Code](#9-generating-code)
10. [Running a Pipeline](#10-running-a-pipeline)
11. [Inline Data Preview](#11-inline-data-preview)
12. [Saving and Loading Pipelines](#12-saving-and-loading-pipelines)
13. [Sample Pipelines](#13-sample-pipelines)
14. [ML vs LLM Pipelines](#14-ml-vs-llm-pipelines)
15. [Integrations](#15-integrations)
16. [Plugin Manager](#16-plugin-manager)
17. [AI Assistant](#17-ai-assistant)
18. [Settings](#18-settings)
19. [Keyboard Shortcuts](#19-keyboard-shortcuts)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Getting Started

### Launching the web app

Start both the frontend and backend servers:

```bash
# Terminal 1 — Frontend
pnpm dev:web         # http://localhost:3000

# Terminal 2 — Backend (required for code gen, Run, uploads, previews)
cd apps/backend
uv run uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:3000** in your browser. You will be redirected automatically to the ML Pipeline canvas.

### Launching the desktop app

Double-click the installer (`.exe` on Windows, `.dmg` on macOS, `.AppImage` on Linux). The desktop app starts the backend automatically — no separate terminal needed.

If the backend fails to start, the error screen shows:
- The captured Python startup log (or the path to `conduit-backend.log` for the full traceback)
- Whether the backend executable was found
- Step-by-step rebuild instructions if it is missing

Click **Retry** after resolving the issue, or **Copy Logs** to share diagnostics.

---

## 2. The IDE Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ConduitCraft AI   ML Pipeline │ LLM Pipeline │ Samples │ Plugins  [⎇][⚙][🤖]  │
├──────────────┬─────────────────────────────────────────────┬────────────────────┤
│              │  Toolbar: pipeline name · node count · Run  │                    │
│  Node        │─────────────────────────────────────────────│  Node              │
│  Palette     │  Canvas tab  │  Code tab                    │  Inspector         │
│  (left)      │                                             │  (right)           │
│              │         React Flow Canvas                   │                    │
│              │         (drag-and-drop area)                │                    │
├──────────────┴─────────────────────────────────────────────┴────────────────────┤
│  Log Panel (appears while pipeline is running)                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Area | Purpose |
|---|---|
| **Header** | Switch ML / LLM pipelines; open Samples, Plugins. Integrations (⎇), Settings (⚙), AI Assistant (🤖) in top-right. |
| **Node Palette** (left) | Search and drag node types onto the canvas. |
| **Canvas** (center) | Build your pipeline by dropping and connecting nodes. |
| **Code tab** | Generate, view, and export code in 4 formats. |
| **Node Inspector** (right) | Configure the selected node's parameters; view live output after a run. |
| **Log Panel** (bottom) | Real-time stdout/stderr output while a pipeline is running. |

---

## 3. Building a Pipeline

### Adding nodes

1. Find a node in the **Node Palette** on the left — use the search box to filter (e.g., type `csv`).
2. **Click and drag** the node card onto the canvas, then release.

### Moving and deleting nodes

- **Move:** click and drag the node card to reposition.
- **Delete:** click to select, then press `Delete` or `Backspace`.

### Canvas navigation

| Action | How |
|---|---|
| Pan | Click and drag the canvas background |
| Zoom | Scroll wheel, or `+` / `−` buttons (bottom left) |
| Fit all nodes | Fit-view button (bottom left controls) |
| Minimap | Always visible (bottom right) — click to jump to an area |

---

## 4. Configuring Nodes

1. **Click a node** on the canvas to select it.
2. The **Node Inspector** panel on the right shows the configuration form.
3. Fill in the fields — file path, column names, hyperparameters, etc.
4. Changes are saved automatically to the pipeline state.

### Inspector sections

| Section | Description |
|---|---|
| **Config fields** | All user-configurable parameters for this node |
| **Integration badge** | Fields pre-filled from your Integrations settings show a blue `integration` tag |
| **Remote dropdowns** | Fields like *Experiment Name* or *Dataset Name* fetch live options from the backend |
| **Inputs / Outputs** | Port types that flow into and out of this node |
| **Pip Packages** | Libraries this node requires when the generated code is run |
| **Output Preview** | DataFrame table, model name, or metrics shown after a successful run |

---

## 5. Connecting Nodes

Nodes have **handles** (small coloured circles) on their left edge (inputs) and right edge (outputs).

1. Hover over an **output handle** on the source node — it highlights.
2. **Click and drag** from the output handle.
3. **Drop** onto an **input handle** of another node.
4. A coloured, animated edge appears.

To **remove** a connection, click the edge and press `Delete`.

### Port type colours

Each handle colour indicates the data type: `DataFrame` (blue), `Model` (purple), `Embeddings` (orange), `Text` (green), `Metrics` (yellow), `Any` (grey). The **Validate** button (toolbar) scans the whole pipeline for type mismatches.

---

## 6. Data Connectors — Test & Preview

For **ingest nodes** (CSV, Parquet, S3, Azure, GCS, PostgreSQL, HuggingFace Datasets), the Inspector shows two extra buttons:

- **Test Connection** — verifies the data source is reachable. Shows green ✓ or red ✗ with a message.
- **Preview** — fetches the first 20 rows and displays them as a table inside the Inspector.

> Both buttons require the backend to be running.

**HuggingFace Datasets node:** the *Dataset Name* field shows a live search dropdown as you type. Results are fetched from the Hub and filtered in real time. Your HuggingFace token (set in Integrations) is forwarded automatically for gated datasets.

---

## 7. File Upload

Ingest nodes with a **File Path** field show a file upload widget in the Inspector:

1. Click the **↑** (upload) button next to the file path field.
2. Select a CSV, Parquet, or JSON file from your local machine.
3. The file is uploaded to the backend and the path is set automatically.

Uploaded files are stored server-side (`apps/backend/uploads/`) and are included automatically in Docker builds. In the desktop app they are stored next to the backend executable.

---

## 8. File Browser

Click the **folder icon** in the toolbar (or set a Project Folder in Settings) to open the **File Browser** panel:

- Browse files and directories in the current project folder.
- Uploaded files and saved code appear here automatically.
- Click a file to copy its path into the currently selected node's file path field.

---

## 9. Generating Code

1. Build your pipeline on the canvas.
2. Click the **Code** tab in the toolbar area.
3. Click **Generate** to call the backend and produce code.
4. Use the format tabs to switch between outputs:

| Tab | Output |
|---|---|
| **Python Script** | `pipeline.py` — standalone executable Python script |
| **Notebook** | `pipeline.ipynb` — Jupyter notebook, one cell per node |
| **Kubeflow DSL** | `pipeline_kubeflow.py` — Kubeflow Pipelines v2 DSL + compiled YAML |
| **Dockerfile** | `Dockerfile` + `requirements.txt` — containerised version |

5. **Package Layout** (Python tab only) — toggle to generate an installable Python package:
   - `src/<slug>/pipeline.py` — all node code wrapped in a `run()` function
   - `src/<slug>/__init__.py`
   - `pipeline.py` — root entrypoint that calls `run()`
   - `requirements.txt`, `pyproject.toml`

6. **Export** — downloads the active format as a file.
7. **Save to Project Folder** — writes the active format directly to your project folder. A green ✓ badge appears on the tab to confirm. Each format is saved independently.

> Code generation requires the backend to be running. Generate before saving — the Save button is disabled until code is generated.

---

## 10. Running a Pipeline

1. Build your pipeline on the canvas.
2. Click **Run** in the toolbar dropdown:

| Option | Description |
|---|---|
| **Run** | Execute locally with the current Python environment |
| **Run (install packages)** | Install required pip packages first, then execute |
| **Run as Docker** | Build a Docker image and execute inside it |
| **Run as Docker (install)** | Install packages into the Docker image first |
| **Run on Kubeflow** | Submit the pipeline to Kubeflow Pipelines (prompts for host and experiment) |

3. The **Log Panel** opens at the bottom showing real-time output.
4. Each node updates its border colour as execution progresses:
   - **Blue** — currently running
   - **Green** — completed successfully (output preview appears)
   - **Red** — failed
5. Click **✕** on the Log Panel to close it.

> If the backend is not running, a red error banner appears.

---

## 11. Inline Data Preview

After a successful run, each node automatically shows its output directly on the canvas card:

| Output type | What you see on the node |
|---|---|
| **DataFrame** | Shape badge (`1000 × 5`) + scrollable mini-table (3 rows × 4 columns) |
| **Model** | Purple badge with the class name (e.g., `🤖 RandomForestClassifier`) |
| **Metrics dict** | Key/value list with green values (e.g., `accuracy: 0.9432`) |
| **Text** | Truncated string preview |
| **Number** | Raw value |

**Full detail in Inspector:** click any node with results to see the complete output in the Node Inspector — a 5-row × 6-column table with dtype badges and the run duration.

Output previews persist until the next run or page refresh.

---

## 12. Saving and Loading Pipelines

### Save / Load

- **Save** (toolbar) — download the current pipeline as `<name>.pipeline.json`.
- **Load** (toolbar) — open a file picker and restore a saved `.pipeline.json`.

### Reset

**Reset** (toolbar) clears the canvas. This cannot be undone — save first.

### Rename

Click the pipeline name field in the toolbar and type a new name.

### Auto-save

Enable **Auto-save Pipeline** in Settings to persist the pipeline to `localStorage` on every change. It is restored automatically on next launch (keyed to `conduitcraft:project`).

---

## 13. Sample Pipelines

Click the **Samples** tab in the header to browse 10 pre-built pipelines:

| Pipeline | Description |
|---|---|
| Iris Classification — Random Forest | Multiclass classification, MLflow logging, evaluation |
| House Price Regression — XGBoost | Feature scaling, XGBoost, MLflow |
| Customer Churn — Logistic Regression | Encoding, scaling, drift monitoring |
| Image Classification — Keras CNN | CNN from S3 data, deploy to HuggingFace Hub |
| Fraud Detection — Gradient Boosting | PostgreSQL source, FastAPI serving, monitoring |
| PDF RAG — OpenAI + Chroma | PDF → chunk → embed → Chroma → GPT-4o → LangServe |
| Web Scraper RAG — Claude + FAISS | Web docs → HuggingFace embed → FAISS → Claude → FastAPI |
| Local Private RAG — Ollama + FAISS | Fully local: Ollama + Llama 3, no cloud APIs |
| ReAct Agent — OpenAI Tool Use | GPT-4o agent with web search, calculator, Python REPL |
| Enterprise RAG — S3 + Pinecone + Claude | Company knowledge base → OpenAI embed → Pinecone → Claude |

Click **Open in Canvas** on any card to load it. The toolbar **Sample** button loads a quick default for the current pipeline type.

---

## 14. ML vs LLM Pipelines

Use the **ML Pipeline** and **LLM Pipeline** tabs in the header to switch modes.

- Each pipeline has its own **separate canvas** — tabs do not share state.
- The Node Palette automatically shows only nodes for the active pipeline type.
- Switching tabs **resets** the canvas for the new type.

### ML Pipeline node categories

`Data Ingestion → Transform → Training → Evaluation → Deploy → Monitoring`

### LLM Pipeline node categories

`Data Ingestion → Chunking → Embedding → Vector Store → LLM Model → Chain / Agent → Deploy → Monitoring`

---

## 15. Integrations

Click **⎇** (top-right header) to open the Integrations panel. Configure API keys and endpoints for all MLOps services.

| Service | Fields | Notes |
|---|---|---|
| **MLflow** | Tracking URI, experiment name | Default `http://localhost:5000` |
| **Kubeflow Pipelines** | Host, namespace, token | OAuth2 proxy detected automatically; paste `authservice_session` cookie for Dex/Istio clusters |
| **HuggingFace Hub** | Access token, username, cache dir | Token forwarded in dataset/model search dropdowns |
| **OpenAI** | API key, org ID, base URL | |
| **Anthropic** | API key | |
| **AWS S3** | Access key, secret, region | Default region `us-east-1` |

**For each integration:**
1. Fields are pre-filled with sensible defaults — change only what is different in your setup.
2. Click **Test Connection** to verify the service is reachable.
3. Click **Save** — credentials are stored in `localStorage` (key `conduitcraft:integrations`).
4. Configured values are automatically pre-filled in matching node config fields (shown with an `integration` badge).

### Kubeflow OAuth2 / Dex

If your KFP is behind an oauth2-proxy (most full Kubeflow installs), the `/healthz` endpoint returns an HTML login page. To authenticate:

1. Open the KFP UI in your browser and log in.
2. Open **DevTools → Application → Cookies**.
3. Copy the value of `authservice_session`.
4. Paste it into the **Token** field in the Kubeflow integration.

---

## 16. Plugin Manager

Click the **Plugins** tab in the header.

- **Install** — installs and enables a community plugin.
- **Enable / Disable** toggle — disabled plugins are hidden from the Node Palette.
- **Remove** — uninstalls the plugin.
- **Filter** by category (`connector`, `node`, `integration`) and `Installed / Available`.

Installed plugins are discovered from `~/.conduitcraft/plugins/` at startup.

---

## 17. AI Assistant

Click **🤖** (top-right header) or the **Assistant** button on the canvas to open the AI Agent panel.

The assistant can:
- Suggest the next node to add based on the current pipeline
- Explain what a selected node does
- Recommend improvements or alternative approaches
- Answer questions about ML/LLM pipeline design

Type your question or request in the text field and press **Enter**.

---

## 18. Settings

Click **⚙** (top-right header) to open Settings.

| Setting | Description |
|---|---|
| Color Theme | Dark / Light / System |
| Auto-save Pipeline | Persist pipeline to localStorage on every change |
| Project Folder | Default folder for saving generated code and uploaded files |
| Default Code Format | Format pre-selected when the Code tab opens |
| Show Minimap | Toggle minimap visibility |
| Show Canvas Grid | Toggle dot-grid background |
| Snap to Grid | Snap nodes to a grid while dragging |
| Edge Style | Smooth Step / Bezier / Straight |
| Plugin Directory | Path scanned for community plugins (desktop only) |

---

## 19. Keyboard Shortcuts

| Key | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected node or edge |
| `Escape` | Deselect current node |
| `Ctrl + Scroll` | Zoom in/out |
| `Space + Drag` | Pan canvas |

---

## 20. Troubleshooting

### "Cannot reach backend" when clicking Run or Generate

- Start the backend: `cd apps/backend && uv run uvicorn app.main:app --port 8000`
- Desktop app: the backend starts automatically. If it fails, click **Copy Logs** on the error screen and check `conduit-backend.log` next to the executable.

### Desktop app shows "Backend failed to start"

1. Check whether the executable exists — the error screen tells you the exact path.
2. If missing: rebuild with `pyinstaller conduit-backend.spec --clean` (in `apps/backend/`), then `pnpm dist` (in `apps/desktop/`).
3. If the exe exists but crashes: read `conduit-backend.log` for the Python traceback.
4. Click **Retry** after resolving the issue.

### CSV upload "Failed to fetch" / CORS error

- This is fixed in the current version. If you see it, ensure the backend is running and the frontend is connecting to `http://127.0.0.1:8000` (not `localhost` on Windows, which may resolve to IPv6).

### HuggingFace dataset node — no results in dropdown

- Click the **Dataset Name** field to focus it — results load on focus.
- Type a search term; the list refreshes after 400ms debounce.
- If you have a HF token set in Integrations, it is forwarded automatically for gated datasets.
- Ensure the backend is running (`GET /huggingface/datasets` must be reachable).

### Kubeflow — "Failed getting healthz endpoint after 5 attempts"

Your KFP cluster is behind an OAuth2 proxy (Dex/Istio). The healthz endpoint returns an HTML login page instead of JSON.

1. Log into the KFP UI in your browser.
2. Open **DevTools → Application → Cookies**.
3. Copy `authservice_session` value.
4. Paste it into the **Token** field in the Kubeflow Integrations panel.

### Test Connection returns red ✗

- Verify credentials and endpoint URL.
- Make sure the service is reachable from the machine running the backend.
- Check required packages are installed (e.g., `boto3` for S3, `kfp` for Kubeflow).

### Run / Run as Docker does nothing

Ensure nodes are on the canvas (the Run button is disabled with an empty canvas). If the pipeline starts but all nodes immediately fail, check the Log Panel for an `IndentationError` — this is fixed in the current version; restart the backend after updating.

### Code generation produces `# ⚠ Unknown node type`

The node has no matching Jinja2 template in the backend. This is expected for plugin nodes without backend templates — use the generated code as a starting point and fill in the logic manually.

### "Module not found" running the generated Python script

The generated script lists required packages in a header comment. Install them:
```bash
pip install <packages>
# or
uv add <packages>
```

### E2E tests fail

Ensure the dev server is running on port 3000 before running Playwright:
```bash
pnpm dev:web &
cd apps/web && pnpm exec playwright test
```

---

*For additional help or to report a bug, open an issue at https://github.com/conduitcraft-ai/conduitcraft-ai/issues*
