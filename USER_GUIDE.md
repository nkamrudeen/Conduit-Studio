# AI-IDE User Guide

This guide walks you through every feature of AI-IDE from first launch to running and exporting a full pipeline.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The IDE Layout](#2-the-ide-layout)
3. [Building a Pipeline](#3-building-a-pipeline)
4. [Configuring Nodes](#4-configuring-nodes)
5. [Connecting Nodes](#5-connecting-nodes)
6. [Testing Data Connections](#6-testing-data-connections)
7. [Generating Code](#7-generating-code)
8. [Running a Pipeline](#8-running-a-pipeline)
9. [Saving and Loading Pipelines](#9-saving-and-loading-pipelines)
10. [Sample Pipelines](#10-sample-pipelines)
11. [ML vs LLM Pipelines](#11-ml-vs-llm-pipelines)
12. [Integrations](#12-integrations)
13. [Plugin Manager](#13-plugin-manager)
14. [Settings](#14-settings)
15. [Keyboard Shortcuts](#15-keyboard-shortcuts)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Getting Started

### Launching the web app

Start both the frontend and backend servers:

```bash
# Terminal 1 — Frontend
pnpm dev:web         # http://localhost:3000

# Terminal 2 — Backend (required for code gen and Run)
cd apps/backend
uv run uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:3000** in your browser. You will be automatically redirected to the ML Pipeline canvas.

### Launching the desktop app

If you have built the Electron installer, double-click the installer (`.exe` on Windows, `.dmg` on macOS, `.AppImage` on Linux). The desktop app starts the backend automatically — you do not need to run it separately.

---

## 2. The IDE Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙ AI-IDE   ML Pipeline | LLM Pipeline | Samples | Plugins     │
├────────────┬────────────────────────────────┬───────────────────┤
│            │  Toolbar: name · nodes · Run   │                   │
│  Node      │────────────────────────────────│  Node             │
│  Palette   │  Canvas tab  │  Code tab       │  Inspector        │
│  (left)    │              │                 │  (right)          │
│            │    React Flow Canvas           │                   │
│            │    (drag-and-drop area)        │                   │
├────────────┴────────────────────────────────┴───────────────────┤
│  Log Panel (appears when pipeline is running)                   │
└─────────────────────────────────────────────────────────────────┘
```

| Area | Purpose |
|---|---|
| **Header** | Switch between ML Pipeline, LLM Pipeline, Samples, and Plugins. Access Integrations and Settings via the icon buttons (top right). |
| **Node Palette** (left) | Search and drag node types onto the canvas. |
| **Canvas** (center) | Build your pipeline by dropping and connecting nodes. |
| **Code tab** | View generated code and export it. |
| **Node Inspector** (right) | Configure the selected node's parameters. |
| **Log Panel** (bottom) | Real-time stdout/stderr output when a pipeline is running. |

---

## 3. Building a Pipeline

### Adding nodes

1. Find a node in the **Node Palette** on the left. Use the search box to filter by name (e.g., type `csv` to find CSV Ingest).
2. **Click and drag** the node card onto the canvas.
3. Release the mouse button — the node appears as a card on the canvas.

### Moving nodes

Click and drag any node card to reposition it on the canvas.

### Deleting nodes

1. Click the node to select it (a colored border appears).
2. Press `Delete` or `Backspace`.

### Canvas navigation

| Action | How |
|---|---|
| Pan | Click and drag the canvas background |
| Zoom in/out | Scroll wheel, or use the `+` / `−` buttons (bottom left) |
| Fit all nodes | Click the fit-view button (bottom left controls) |
| Minimap | Always visible (bottom right) — click to jump to any area |

---

## 4. Configuring Nodes

1. **Click a node** on the canvas to select it.
2. The **Node Inspector** panel on the right shows the node's configuration form.
3. Fill in the fields — for example, set the CSV file path, the target column, or the number of estimators.
4. Changes are saved automatically to the pipeline state.

The Inspector also shows:
- **Pipeline badge** (ML or LLM)
- **Input/Output port types** — the data types that flow in and out
- **Pip Packages** — libraries this node requires when you run the generated code

---

## 5. Connecting Nodes

Nodes have **handles** (small circles) on their left edge (inputs) and right edge (outputs).

1. Hover over an **output handle** on a source node — it highlights.
2. **Click and drag** from the output handle.
3. **Drop** onto an **input handle** of another node.
4. A colored, animated edge appears connecting the two nodes.

### Port type rules

Each handle has a type (e.g., `DataFrame`, `Model`, `Embeddings`). Connections between incompatible types are still allowed visually but the generated code may fail if types mismatch.

### Removing a connection

Click an edge to select it, then press `Delete`.

---

## 6. Testing Data Connections

For **ingest nodes** (CSV, S3, Azure, GCS, PostgreSQL), the Inspector shows two extra buttons after configuration:

- **Test Connection** — calls the backend to verify the data source is reachable. Shows a green ✓ or red ✗.
- **Preview** — fetches the first 20 rows and displays them as a mini table inside the Inspector.

> These buttons require the backend to be running on port 8000.

---

## 7. Generating Code

1. Build your pipeline on the canvas (add and connect nodes).
2. Click the **Code** tab (next to the Canvas tab in the toolbar area).
3. Click **Generate** to call the backend and produce code.
4. Use the format tabs to switch between outputs:

| Tab | Output |
|---|---|
| **Python Script** | `pipeline.py` — standalone executable Python script |
| **Notebook** | `pipeline.ipynb` — Jupyter notebook, one cell per node |
| **Kubeflow DSL** | `pipeline_kubeflow.py` — Kubeflow Pipelines v2 DSL |
| **Dockerfile** | `Dockerfile` + `requirements.txt` — containerised version |

5. Click **Export** to download the file.

> Code generation requires the backend to be running.

---

## 8. Running a Pipeline

1. Build your pipeline on the canvas.
2. Click the **Run** button in the toolbar (top right of the canvas area).
3. The **Log Panel** opens at the bottom, showing real-time output.
4. Each node card updates its border colour as execution progresses:
   - **Blue border** — node is currently running
   - **Green border** — node completed successfully
   - **Red border** — node failed
5. When all nodes finish, the log shows `✓ Pipeline finished`.
6. Click **Stop** to interrupt a running pipeline.
7. Click **✕** on the Log Panel to close it.

> Running requires the backend. If the backend is not running, a red error banner appears: *"Cannot reach backend. Start the FastAPI server on port 8000."*

---

## 9. Saving and Loading Pipelines

### Save

Click the **Save** button (toolbar) to download the current pipeline as a `.pipeline.json` file. The filename is derived from the pipeline name.

### Load

Click the **Load** button (toolbar) to open a file picker. Select a previously saved `.pipeline.json` file to restore it.

### Reset

Click **Reset** (toolbar) to clear the canvas. This cannot be undone — save first if you want to keep the current pipeline.

### Renaming a pipeline

Click the pipeline name field in the toolbar (left side) and type a new name.

---

## 10. Sample Pipelines

Click the **Samples** tab in the top navigation to browse 10 pre-built pipelines.

| Pipeline | Description |
|---|---|
| Iris Classification — Random Forest | Multiclass classification with missing-value handling, evaluation, and MLflow logging |
| House Price Regression — XGBoost | Regression with feature scaling, XGBoost, and MLflow |
| Customer Churn — Logistic Regression | Binary classification with encoding, scaling, and drift monitoring |
| Image Classification — Keras CNN | CNN training from S3 data, deployed to HuggingFace Hub |
| Fraud Detection — Gradient Boosting | From PostgreSQL, with outlier removal, FastAPI serving, and monitoring |
| PDF RAG — OpenAI + Chroma | PDF → chunk → embed → Chroma → GPT-4o → LangServe |
| Web Scraper RAG — Claude + FAISS | Web docs → HuggingFace embed → FAISS → Claude Sonnet → FastAPI |
| Local Private RAG — Ollama + FAISS | Fully local: Ollama embeddings + Llama 3 — no cloud APIs |
| ReAct Agent — OpenAI Tool Use | GPT-4o agent with web search, calculator, and Python REPL |
| Enterprise RAG — S3 + Pinecone + Claude | Company knowledge base → OpenAI large embed → Pinecone → Claude Opus |

Click **Open in Canvas** on any card to load it into the appropriate pipeline type. You can then inspect, modify, and run it.

The toolbar also has a **Sample** button that loads a quick default sample for the current pipeline type (ML or LLM).

---

## 11. ML vs LLM Pipelines

Use the **ML Pipeline** and **LLM Pipeline** tabs in the header to switch modes.

- Each pipeline has its own **separate canvas** — switching tabs does not mix node types.
- The **Node Palette** automatically shows only nodes relevant to the selected pipeline type.
- Switching tabs **resets** the canvas for the new pipeline type.

### ML Pipeline node categories

`Data Ingestion → Transform → Training → Evaluation → Deploy → Monitoring`

### LLM Pipeline node categories

`Data Ingestion → Chunking → Embedding → Vector Store → LLM Model → Chain / Agent → Deploy → Monitoring`

---

## 12. Integrations

Click the **Integrations** button (top-right header, the branching icon) to open the Integrations side panel. Configure API keys and endpoints for:

| Service | Purpose |
|---|---|
| **MLflow** | Experiment tracking, model registry, artifact logging |
| **Kubeflow Pipelines** | Pipeline submission and run management |
| **HuggingFace Hub** | Model/dataset download and push |
| **OpenAI** | API key for OpenAI nodes |
| **Anthropic** | API key for Claude nodes |
| **AWS S3** | Access key and secret for S3 connector |

For each integration:
1. Fill in the endpoint URL or API key.
2. Click **Test Connection** to verify.
3. Click **Save** — credentials are stored in `localStorage` (or the OS keychain in Electron).

Documentation links (external) are available on each card.

---

## 13. Plugin Manager

Click the **Plugins** tab in the top navigation to open the Plugin Manager.

### Installing a plugin

1. Find an available plugin in the grid.
2. Click **Install** — the plugin is installed and enabled.

### Enabling / Disabling a plugin

Toggle the **Enabled / Disabled** switch on an installed plugin card. Disabled plugins do not appear in the Node Palette.

### Removing a plugin

Click **Remove** on an installed plugin card.

### Filtering

Use the category buttons (`connector`, `node`, `integration`) and the `Installed / Available` toggle to filter the plugin list.

---

## 14. Settings

Click the **Settings** button (top-right header, the gear icon) to open the Settings panel.

| Setting | Description |
|---|---|
| Color Theme | Dark / Light / System |
| Auto-save Pipeline | Save pipeline to localStorage on every change |
| Backend URL | URL of the FastAPI server (default: `http://localhost:8000`) |
| Default Code Format | Format pre-selected in the Code tab |
| Show Minimap | Toggle minimap visibility |
| Show Canvas Grid | Toggle dot-grid background |
| Snap to Grid | Snap nodes to a grid while dragging |
| Edge Style | Smooth Step / Bezier / Straight |
| Plugin Directory | Path scanned for community plugins (desktop only) |

Click **Save Settings** to persist to `localStorage`.

---

## 15. Keyboard Shortcuts

| Key | Action |
|---|---|
| `Delete` / `Backspace` | Delete selected node or edge |
| `Escape` | Deselect current node |
| `Ctrl + Scroll` | Zoom in/out |
| `Space + Drag` | Pan canvas |

---

## 16. Troubleshooting

### Nodes are not appearing on the canvas after dragging

- Ensure you are dropping onto the grey canvas area (not the palette or inspector).
- Try refreshing the page. The canvas state is preserved in memory per session.

### "Cannot reach backend" error when clicking Run or Generate

- Start the FastAPI backend: `cd apps/backend && uv run uvicorn app.main:app --port 8000`
- Check the backend URL in **Settings** — it must match the running server (default: `http://localhost:8000`).
- If using the desktop app, the backend should start automatically. Check the app logs for errors.

### Test Connection returns a red ✗

- Verify the credentials and endpoint URL in the Inspector.
- Make sure the data source is reachable from the machine running the backend.
- Check that required packages are installed in the backend environment (e.g., `boto3` for S3).

### Code generation produces a `# ⚠ Unknown node type` comment

- The node definition ID has no matching Jinja2 template in the backend.
- This is expected for community plugin nodes that do not have backend templates. Use the generated code as a starting point and fill in the node's logic.

### The Playwright E2E tests fail

- Ensure the frontend dev server is running on **port 3000** before running tests.
- Run: `pnpm dev:web` then in a second terminal: `cd apps/web && pnpm exec playwright test`

### "Module not found" errors when running the generated Python script

- The generated script lists required packages in the header comment.
- Install them: `pip install <packages>` or add them to your environment.

---

*For additional help, open an issue at https://github.com/ai-ide/ai-ide/issues*
