import React, { useState } from 'react'
import { ScrollArea } from '@ai-ide/ui'
import {
  BookOpen,
  Workflow,
  Brain,
  Puzzle,
  Code2,
  Play,
  ChevronRight,
  Database,
  GitBranch,
  Box,
  ShieldCheck,
  Layers,
  Zap,
  Lock,
  Cloud,
  History,
  FlaskConical,
  Split,
  GraduationCap,
  Terminal,
  BarChart2,
} from 'lucide-react'

interface Section {
  id: string
  icon: React.ReactNode
  title: string
  group?: string
  content: React.ReactNode
}

const PORT_TYPE_COLORS: Record<string, string> = {
  DataFrame:   '#3b82f6',
  Model:       '#a855f7',
  Embeddings:  '#f59e0b',
  VectorStore: '#14b8a6',
  Text:        '#22c55e',
  Metrics:     '#f97316',
  Any:         '#64748b',
}

function DevBanner() {
  return (
    <div className="mb-3 flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
      <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">Coming Soon</span>
      <span>This feature is coming soon and not yet available in the current release.</span>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{n}</span>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <div className="text-[11px] text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border p-2 space-y-1">
      <p className="text-[11px] font-semibold text-foreground">{title}</p>
      <div className="text-[10px] text-muted-foreground">{children}</div>
    </div>
  )
}

const sections: Section[] = [
  // ── Reference ────────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    icon: <Zap size={15} />,
    title: 'Getting Started',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <p>ConduitCraft AI is a visual drag-and-drop IDE for building ML and LLM pipelines. You compose a pipeline as a flowchart and the IDE generates executable Python code from it.</p>
        <ol className="space-y-2 list-none">
          {[
            ['Pick a pipeline mode', 'Choose ML Pipeline (scikit-learn, XGBoost, PyTorch…) or LLM Pipeline (RAG, fine-tuning, agents…) from the top nav.'],
            ['Drag nodes onto the canvas', 'Browse the left palette by category. Drag any node onto the canvas to add it.'],
            ['Connect nodes', 'Drag from an output handle (right side, coloured dot) to an input handle (left side). Only compatible port types can connect.'],
            ['Configure each node', 'Click a node to open the Inspector on the right and fill in its settings.'],
            ['Generate & run', 'Switch to the Code tab to preview the generated script, or click Run to execute it locally.'],
          ].map(([step, desc], i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
              <div>
                <p className="text-xs font-semibold text-foreground">{step}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: 'ml-pipeline',
    icon: <Workflow size={15} />,
    title: 'ML Pipeline',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <p>The ML pipeline covers the full model lifecycle from raw data to production monitoring.</p>
        <div className="rounded border border-border bg-muted/30 p-2 font-mono text-[10px] text-muted-foreground">
          Ingest → Transform → Train → Evaluate → Deploy → Monitor
        </div>
        <div className="space-y-2">
          {[
            ['Ingest', 'CSV, Parquet, S3, Azure Blob, GCS, PostgreSQL, HuggingFace Datasets'],
            ['Transform', 'Column select, missing values, row filter, scaler, encoder, outlier removal, train/test split'],
            ['Train', 'scikit-learn (Random Forest, Gradient Boosting, Logistic Regression, SVM, XGBoost), Keras, PyTorch'],
            ['Evaluate', 'Classification metrics, regression metrics, cross-validation'],
            ['Deploy', 'MLflow Model Registry, FastAPI server, HuggingFace Hub, Docker'],
            ['Monitor', 'Evidently drift detection, model performance dashboards'],
            ['MLflow tracking', 'Set experiment, autolog, log params/metrics, compare runs, load model'],
            ['A/B Split', 'Fork execution into two branches (random / first-N / stratified) for side-by-side comparison'],
          ].map(([cat, desc]) => (
            <div key={cat} className="flex gap-2 text-[11px]">
              <span className="w-28 shrink-0 font-semibold text-primary">{cat}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'llm-pipeline',
    icon: <Brain size={15} />,
    title: 'LLM Pipeline',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <p>The LLM pipeline covers RAG systems, fine-tuning workflows, and agent chains.</p>
        <div className="rounded border border-border bg-muted/30 p-2 font-mono text-[10px] text-muted-foreground">
          Ingest → Chunk → Embed → VectorStore → LLM → Chain → Deploy → Monitor
        </div>
        <div className="space-y-2">
          {[
            ['Ingest', 'PDF, web pages, S3 documents'],
            ['Chunk', 'Recursive text splitter, Markdown splitter'],
            ['Embed', 'OpenAI, HuggingFace, Ollama'],
            ['VectorStore', 'Chroma, FAISS, Pinecone'],
            ['LLM', 'OpenAI, Anthropic Claude, Ollama (local), vLLM'],
            ['Chain', 'RAG chain, ReAct agent, LangGraph workflow, LlamaIndex query'],
            ['Fine-tune', 'Dataset prep, LoRA/QLoRA config, SFT trainer, merge & push to Hub'],
            ['Deploy', 'LangServe, FastAPI, Azure ML endpoint'],
            ['Monitor', 'Usage tracking via LangSmith'],
            ['A/B Split', 'Fork LLM documents or prompts into two branches for comparison'],
          ].map(([cat, desc]) => (
            <div key={cat} className="flex gap-2 text-[11px]">
              <span className="w-28 shrink-0 font-semibold text-purple-400">{cat}</span>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'port-types',
    icon: <GitBranch size={15} />,
    title: 'Port Types & Connections',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <p>Every node port has a type. You can only connect an output to an input of the same type. <strong className="text-foreground">Any</strong> is a wildcard that connects to everything.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(PORT_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 rounded border border-border px-2 py-1.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
              <span className="text-[11px] font-medium text-foreground">{type}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 rounded border border-border bg-muted/30 p-2 text-[11px]">
          <p className="font-semibold text-foreground">Typical ML flow</p>
          <p className="text-muted-foreground">Ingest <span style={{ color: PORT_TYPE_COLORS.DataFrame }}>DataFrame</span> → Transform <span style={{ color: PORT_TYPE_COLORS.DataFrame }}>DataFrame</span> → Train <span style={{ color: PORT_TYPE_COLORS.Model }}>Model</span> → Evaluate <span style={{ color: PORT_TYPE_COLORS.Metrics }}>Metrics</span></p>
          <p className="font-semibold text-foreground mt-2">Typical LLM flow</p>
          <p className="text-muted-foreground">Chunk <span style={{ color: PORT_TYPE_COLORS.Text }}>Text</span> → Embed <span style={{ color: PORT_TYPE_COLORS.Embeddings }}>Embeddings</span> → VectorStore <span style={{ color: PORT_TYPE_COLORS.VectorStore }}>VectorStore</span> → RAG Chain</p>
        </div>
        <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-2 text-[11px] text-yellow-300">
          <strong>Validate button</strong> — click Validate in the canvas toolbar to check all connections in your pipeline for type mismatches at once.
        </div>
      </div>
    ),
  },
  {
    id: 'canvas',
    icon: <Layers size={15} />,
    title: 'Canvas Controls',
    group: 'Reference',
    content: (
      <div className="space-y-2 text-[11px]">
        {[
          ['Drag node', 'Click and drag a node to reposition it'],
          ['Pan canvas', 'Click and drag on empty canvas area'],
          ['Zoom', 'Scroll wheel or pinch gesture'],
          ['Select node', 'Click a node to open its Inspector'],
          ['Delete node / edge', 'Select then press Delete or Backspace'],
          ['Fit view', 'Automatically fits when a sample is loaded'],
          ['Save pipeline', 'Toolbar → Save — exports pipeline as .pipeline.json'],
          ['Load pipeline', 'Toolbar → Load — imports a .pipeline.json file'],
          ['History', 'Toolbar → History — view and compare pipeline snapshots'],
          ['Reset', 'Toolbar → Reset — clears the canvas'],
        ].map(([action, desc]) => (
          <div key={action} className="flex gap-2">
            <span className="w-32 shrink-0 font-semibold text-foreground">{action}</span>
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'codegen',
    icon: <Code2 size={15} />,
    title: 'Code Generation',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <p>The visual pipeline is the single source of truth. Code is always generated from the flow — never edited back in.</p>
        <div className="space-y-2">
          {[
            ['Python Script', 'pipeline.py — standalone executable script, one function per node'],
            ['Notebook', 'pipeline.ipynb — Jupyter notebook, one cell per node with markdown headers'],
            ['Kubeflow DSL', 'pipeline_kubeflow.py — Kubeflow Pipelines v2 DSL compiled to YAML'],
            ['Dockerfile', 'Dockerfile + requirements.txt — containerised version of the pipeline'],
          ].map(([fmt, desc]) => (
            <div key={fmt} className="rounded border border-border p-2">
              <p className="text-[11px] font-semibold text-primary">{fmt}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Switch to the <strong className="text-foreground">Code</strong> tab in the canvas, select a format, and click <strong className="text-foreground">Generate</strong>. Use the Download button to save the file.</p>
        <Card title="Model Card Generator">
          <span className="mr-1.5 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-300">Coming Soon</span>
          Deploy nodes have a <strong className="text-foreground">Generate Model Card</strong> button in the Inspector. It produces a HuggingFace-format <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">MODEL_CARD.md</code> in your project folder, pre-filled with architecture, data description, evaluation metrics, and pip requirements.
        </Card>
      </div>
    ),
  },
  {
    id: 'run',
    icon: <Play size={15} />,
    title: 'Running Pipelines',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <div className="space-y-2">
          {[
            {
              mode: 'Run Locally',
              color: 'text-primary',
              desc: 'Generates a Python script and executes it as a subprocess using your local Python environment. Requires the packages listed on each node to be installed.',
            },
            {
              mode: 'Run as Docker',
              color: 'text-blue-400',
              desc: 'Generates a Dockerfile + requirements.txt, builds an image, and runs the pipeline inside the container. Requires Docker Desktop to be running.',
            },
          ].map(({ mode, color, desc }) => (
            <div key={mode} className="rounded border border-border p-2 space-y-1">
              <p className={`text-[11px] font-semibold ${color}`}>{mode}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded border border-border bg-muted/30 p-2 text-[11px]">
          <p className="font-semibold text-foreground mb-1">Log panel</p>
          <p className="text-muted-foreground">The log panel slides in at the bottom of the canvas when a run starts. Each node shows its status (running / success / error) in real time via WebSocket streaming.</p>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2 text-[11px]">
          <p className="font-semibold text-foreground mb-1">Analyze button <span className="ml-1 rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-300">Coming Soon</span></p>
          <p className="text-muted-foreground">Click <strong className="text-foreground">Analyze</strong> in the toolbar before running to check two things: (1) <span className="text-amber-400">estimated LLM token cost</span> — shown in the cost banner above the Run button; (2) <span className="text-red-400">Python package conflicts</span> — nodes with conflicting package requirements show a red badge and tooltip.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'data-sources',
    icon: <Database size={15} />,
    title: 'Data Sources & Connectors',
    group: 'Reference',
    content: (
      <div className="space-y-3">
        <p>Ingest nodes connect to external data sources. Configure credentials in the Inspector panel after dropping an ingest node.</p>
        <div className="space-y-1.5">
          {[
            ['Local CSV / Parquet', 'File path on the machine running the backend'],
            ['AWS S3', 'Bucket, key prefix, region, AWS credentials'],
            ['Azure Blob', 'Container, connection string or SAS token'],
            ['Google Cloud Storage', 'Bucket, prefix, service account JSON'],
            ['PostgreSQL', 'Host, port, database, user, password, SQL query'],
            ['HuggingFace Datasets', 'Dataset name, split, config name'],
          ].map(([src, cfg]) => (
            <div key={src} className="flex gap-2 text-[11px]">
              <span className="w-36 shrink-0 font-semibold text-foreground">{src}</span>
              <span className="text-muted-foreground">{cfg}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Sensitive credential fields (API keys, tokens, connection strings) are automatically backed by the <strong className="text-foreground">Secrets Vault</strong> — values are encrypted at rest and referenced as <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">$SECRET_NAME</code> in generated code.</p>
      </div>
    ),
  },
  {
    id: 'integrations',
    icon: <GitBranch size={15} />,
    title: 'MLOps Integrations',
    group: 'Reference',
    content: (
      <div className="space-y-2 text-[11px]">
        {[
          {
            name: 'MLflow',
            color: 'text-blue-400',
            items: ['Experiment tracking — Set Experiment, Autolog, Log Params/Metrics', 'Model Registry — register, version, and load models', 'Compare Runs — side-by-side metric comparison'],
          },
          {
            name: 'Kubeflow Pipelines',
            color: 'text-purple-400',
            items: ['Generate Kubeflow v2 DSL from any ML pipeline', 'Submit and monitor runs via the Kubeflow UI'],
          },
          {
            name: 'HuggingFace Hub',
            color: 'text-yellow-400',
            items: ['Download models and datasets', 'Push fine-tuned models with model cards', 'Inference API integration'],
          },
        ].map(({ name, color, items }) => (
          <div key={name} className="rounded border border-border p-2 space-y-1">
            <p className={`font-semibold ${color}`}>{name}</p>
            <ul className="space-y-0.5 text-muted-foreground">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <ChevronRight size={10} className="mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-muted-foreground">Configure API keys via the <strong className="text-foreground">Integrations</strong> panel. All password/token fields are stored in the encrypted <strong className="text-foreground">Secrets Vault</strong> — not in plain localStorage.</p>
      </div>
    ),
  },
  {
    id: 'secrets',
    icon: <Lock size={15} />,
    title: 'Secrets Vault',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <DevBanner />
        <p>The Secrets Vault stores API keys, tokens, and connection strings encrypted (AES-256 Fernet) in your project folder — never in plain text.</p>
        <div className="space-y-2">
          <Card title="Accessing the vault">
            Open <strong className="text-foreground">Settings → Secrets</strong> (⚙ icon, top-right). Add a secret by entering a name and value and clicking <strong className="text-foreground">Add Secret</strong>. Secret names are shown; values are write-only.
          </Card>
          <Card title="Using secrets in node config">
            Integrations panel password fields automatically store values in the vault. The field shows a purple <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">vault</code> badge and a green <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">stored as $KEY</code> badge when saved.
          </Card>
          <Card title="Generated code">
            Secret references render as <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">os.environ["SECRET_NAME"]</code> in generated Python code. A companion <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">.env.example</code> lists all required variable names.
          </Card>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2">
          <p className="font-semibold text-foreground mb-1">Storage</p>
          <p className="text-muted-foreground">Secrets are stored in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">{'{project_folder}'}/.secrets.json</code> (encrypted) with the key in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">.vault.key</code>. Both files are gitignored automatically.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'playground',
    icon: <FlaskConical size={15} />,
    title: 'Prompt Playground',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <DevBanner />
        <p>For LLM and Chain nodes, the Inspector has a <strong className="text-foreground">Playground</strong> tab alongside Config where you can test prompts live without running the full pipeline.</p>
        <div className="space-y-2">
          <Card title="Running a test">
            Select an LLM or RAG chain node → Inspector → <strong className="text-foreground">Playground</strong> tab. Enter a test query, adjust the temperature slider, and click <strong className="text-foreground">Run</strong>. The model's response streams token-by-token into the output area.
          </Card>
          <Card title="Prompt versioning">
            Each time you save a prompt template edit a new version is created (v1, v2 …). The version list on the right lets you switch between versions and see a diff. Pin the best version with the <strong className="text-foreground">Pin</strong> button — it becomes the node's active prompt.
          </Card>
          <Card title="Supported nodes">
            Any node with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">supportsPlayground: true</code> shows the Playground tab — OpenAI, Claude, Ollama, RAG Chain, ReAct Agent.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: 'history',
    icon: <History size={15} />,
    title: 'Pipeline History & Diff',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <DevBanner />
        <p>ConduitCraft AI automatically saves a snapshot of your pipeline every 30 seconds and whenever you manually save. You can compare any two snapshots side-by-side and restore an older version.</p>
        <div className="space-y-2">
          <Card title="Opening history">
            Click the <strong className="text-foreground">History</strong> button in the canvas toolbar (clock icon). A modal opens with a list of all saved snapshots sorted by date.
          </Card>
          <Card title="Comparing snapshots">
            Select any two snapshots (A and B) from the list and click <strong className="text-foreground">Compare</strong>. The diff view highlights:
            <ul className="mt-1 space-y-0.5 pl-3">
              <li className="text-green-400">• Green — nodes added in B</li>
              <li className="text-red-400">• Red (strikethrough) — nodes removed in B</li>
              <li className="text-yellow-400">• Yellow — nodes with changed config</li>
            </ul>
            Hover a yellow node to see a field-by-field config diff (old value → new value).
          </Card>
          <Card title="Restoring a snapshot">
            Click <strong className="text-foreground">Restore</strong> next to any snapshot to replace the current canvas with that version. The current canvas is automatically saved as a new snapshot before the restore.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: 'ab-debug',
    icon: <Split size={15} />,
    title: 'A/B Split & Retrieval Debugger',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <DevBanner />
        <p>Two tools for experimenting and debugging without leaving the canvas.</p>
        <div className="space-y-2">
          <Card title="A/B Split node">
            Drag the <strong className="text-foreground">A/B Split</strong> node (under Split category for ML; available in LLM pipelines too) onto the canvas. It forks execution into Branch A and Branch B outputs. Configure the split ratio, strategy (random / first-N / stratified), and optional labels. Connect each branch to separate downstream nodes — the generated Python code runs both branches in parallel using <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">concurrent.futures</code>. Results appear side-by-side in the Experiment Leaderboard.
          </Card>
          <Card title="Retrieval Debugger (RAG)">
            Click a <strong className="text-foreground">RAG Chain</strong> node → Inspector → <strong className="text-foreground">Debug</strong> tab (bug icon — only visible on nodes with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">supportsDebug: true</code>). Enter a test query, choose top-K, and click <strong className="text-foreground">Run Debug</strong>. You see:
            <ul className="mt-1 space-y-0.5 pl-3">
              <li>• Retrieved chunks with colour-coded similarity scores (green &gt;0.7, yellow &gt;0.4, red)</li>
              <li>• The assembled prompt sent to the LLM (collapsible)</li>
              <li>• The final model response</li>
            </ul>
            Use this to tune chunk size, overlap, and similarity threshold without writing tracing code.
          </Card>
        </div>
      </div>
    ),
  },
  {
    id: 'cloud-deploy',
    icon: <Cloud size={15} />,
    title: 'Cloud Deployment',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <DevBanner />
        <p>Submit pipelines directly to cloud ML platforms from the toolbar.</p>
        <div className="space-y-2">
          <Card title="Opening the panel">
            Click the <strong className="text-foreground">Cloud</strong> icon (upload-cloud) in the top-right toolbar to open the Cloud Deployment side panel.
          </Card>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-blue-400">Azure ML</p>
            <p className="text-muted-foreground">Fill in Subscription ID, Resource Group, Workspace, and Tenant ID. Credentials are stored in the Secrets Vault. Click <strong className="text-foreground">Test Connection</strong> to verify, then either:</p>
            <ul className="mt-1 space-y-0.5 pl-3 text-muted-foreground">
              <li>• <strong className="text-foreground">Submit Pipeline Job</strong> — runs the pipeline as an Azure ML job. Choose compute target and experiment name. Job status polls every 5 seconds with a live status badge.</li>
              <li>• <strong className="text-foreground">Deploy Endpoint</strong> — deploys the pipeline output as a real-time inference endpoint. Choose endpoint name, instance type, and model name.</li>
            </ul>
          </div>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-muted-foreground">AWS SageMaker &amp; Google Vertex AI</p>
            <p className="text-muted-foreground">Coming soon — tabs are visible but disabled.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'leaderboard',
    icon: <BarChart2 size={15} />,
    title: 'Experiment Leaderboard',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <DevBanner />
        <p>The Experiment Leaderboard shows all past runs of the current pipeline in a sortable metrics table — without opening the MLflow UI.</p>
        <div className="space-y-2">
          <Card title="Opening the leaderboard">
            Click the <strong className="text-foreground">Runs</strong> icon (bar chart) in the top bar to open the panel.
          </Card>
          <Card title="Comparing runs">
            Check two runs and click <strong className="text-foreground">Compare</strong>. A diff table shows every config value that changed between them, and the metric delta is highlighted.
          </Card>
          <Card title="Run Config view">
            Click any run row to switch the Inspector to <strong className="text-foreground">Run Config</strong> mode — shows that run's node-level configs with diffs from the current pipeline highlighted in yellow.
          </Card>
        </div>
        <p className="text-muted-foreground">Data source: proxies the MLflow Runs API. Falls back to a local SQLite run log when MLflow is not configured.</p>
      </div>
    ),
  },
  {
    id: 'plugins',
    icon: <Puzzle size={15} />,
    title: 'Plugin System',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <p>Plugins extend ConduitCraft AI with custom node types and connectors without modifying the core codebase.</p>
        <div className="space-y-2">
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">Installing a plugin</p>
            <p className="text-muted-foreground">Copy the plugin folder to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">~/.conduitcraft/plugins/</code> and restart the backend. The plugin's nodes appear automatically in the palette.</p>
          </div>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">plugin.manifest.json</p>
            <p className="text-muted-foreground">Every plugin must ship a manifest declaring its <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">id</code>, <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">nodeTypes[]</code>, and <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">permissions[]</code>.</p>
          </div>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">Security model</p>
            <p className="text-muted-foreground">Plugin UI runs in a sandboxed iframe and communicates with the host via <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">postMessage</code>. No direct DOM or Node.js access.</p>
          </div>
        </div>
        <div className="rounded border border-border bg-muted/30 p-2">
          <p className="font-semibold text-foreground mb-1">postMessage API</p>
          <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground">
            <p><span className="text-green-400">Host→Plugin</span>  INIT · GET_CONFIG_SCHEMA · NODE_EXECUTE</p>
            <p><span className="text-blue-400">Plugin→Host</span>  REGISTER_NODE · CONFIG_SCHEMA · EXECUTION_RESULT</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'validate',
    icon: <ShieldCheck size={15} />,
    title: 'Validation',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <div className="space-y-2">
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">Real-time connection guard</p>
            <p className="text-muted-foreground">When drawing a connection, incompatible handles are automatically dimmed. If you attempt to drop on an incompatible port a type-mismatch error appears at the bottom of the canvas for a few seconds.</p>
          </div>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">Validate button</p>
            <p className="text-muted-foreground">Click <strong className="text-foreground">Validate</strong> in the canvas toolbar to scan every edge in the pipeline. Results appear in a banner above the canvas listing each incompatible connection with the expected and actual types.</p>
          </div>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">Package conflict detection</p>
            <p className="text-muted-foreground">Click <strong className="text-foreground">Analyze</strong> to resolve the full pip dependency set. Nodes with conflicting requirements show a red badge with a tooltip naming the conflicting versions.</p>
          </div>
          <div className="rounded border border-border p-2 space-y-1">
            <p className="font-semibold text-foreground">Cycle detection</p>
            <p className="text-muted-foreground">The pipeline must be a directed acyclic graph (DAG). Cycles are detected at code generation time and reported as an error.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'docker',
    icon: <Box size={15} />,
    title: 'Docker & Desktop',
    group: 'Reference',
    content: (
      <div className="space-y-3 text-[11px]">
        <div className="rounded border border-border p-2 space-y-1">
          <p className="font-semibold text-foreground">Running pipelines in Docker</p>
          <p className="text-muted-foreground">Use <strong className="text-foreground">Run as Docker</strong> from the run dropdown. The IDE generates a Dockerfile with all required pip packages, builds an image, and streams container logs to the log panel.</p>
        </div>
        <div className="rounded border border-border p-2 space-y-1">
          <p className="font-semibold text-foreground">Desktop app</p>
          <p className="text-muted-foreground">The Electron desktop app bundles the FastAPI backend as a self-contained executable (PyInstaller). No Python installation is required on the user's machine to run the server. Generated pipeline scripts still run under the user's system Python so all ML packages remain available.</p>
        </div>
      </div>
    ),
  },

  // ── Tutorials ─────────────────────────────────────────────────────────────
  {
    id: 'tut-ml-classification',
    icon: <GraduationCap size={15} />,
    title: '1. ML Classification Pipeline',
    group: 'Tutorials',
    content: (
      <div className="space-y-3">
        <DevBanner />
        <p className="font-semibold text-foreground">Build and deploy a scikit-learn classification model with MLflow tracking.</p>
        <p className="text-[11px] text-muted-foreground">In this tutorial you will build a complete Iris classification pipeline from CSV ingestion through to a deployed MLflow model endpoint.</p>
        <ol className="space-y-3 list-none">
          <Step n={1} title="Create a new ML pipeline">
            Click <strong className="text-foreground">ML Pipeline</strong> in the top nav. The canvas opens with an empty flow.
          </Step>
          <Step n={2} title="Add a CSV Ingest node">
            In the Node Palette, search for <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">csv</code>. Drag <strong className="text-foreground">CSV / Parquet Ingest</strong> onto the canvas. In the Inspector, set <em>File Path</em> to your dataset (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">iris.csv</code>). Click <strong className="text-foreground">Preview</strong> to verify the data loads.
          </Step>
          <Step n={3} title="Add a Scaler node">
            Search for <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">scaler</code>. Drag <strong className="text-foreground">Standard Scaler</strong> onto the canvas. Connect the <span style={{ color: PORT_TYPE_COLORS.DataFrame }}>DataFrame</span> output of the Ingest node to the DataFrame input of Scaler.
          </Step>
          <Step n={4} title="Add a Train/Test Split node">
            Drag <strong className="text-foreground">Train / Test Split</strong> (Transform category) onto the canvas. Connect Scaler → Split. Set <em>Test Size</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">0.2</code> and <em>Target Column</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">species</code>.
          </Step>
          <Step n={5} title="Add a Random Forest Trainer">
            Drag <strong className="text-foreground">Random Forest Classifier</strong> (Train category). Connect Split → RF Trainer. Set <em>n_estimators</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">100</code>. Enable <em>MLflow autolog</em> to track the run automatically.
          </Step>
          <Step n={6} title="Add an Evaluate node">
            Drag <strong className="text-foreground">Classification Metrics</strong> (Evaluate). Connect RF Trainer <span style={{ color: PORT_TYPE_COLORS.Model }}>Model</span> → Evaluate. This logs accuracy, F1, precision, and recall to MLflow.
          </Step>
          <Step n={7} title="Add an MLflow Deploy node">
            Drag <strong className="text-foreground">MLflow Model Registry</strong> (Deploy). Connect RF Trainer → Deploy. Set <em>Model Name</em> and <em>Registered Model Stage</em>. Open Integrations (⎇) and configure your MLflow tracking URI first.
          </Step>
          <Step n={8} title="Generate and run">
            Click <strong className="text-foreground">Code</strong> tab → <strong className="text-foreground">Generate</strong> to preview the Python script. Then click <strong className="text-foreground">Run → Run Locally</strong>. Watch per-node status badges turn green. Open the Evaluate node Inspector to see accuracy in the output preview.
          </Step>
          <Step n={9} title="Generate a Model Card">
            Click the Deploy node. In the Inspector click <strong className="text-foreground">Generate Model Card</strong>. A <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">MODEL_CARD.md</code> is saved to your project folder with architecture, metrics, and data description.
          </Step>
        </ol>
        <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-[11px] text-green-300">
          ✓ Result: A trained model registered in MLflow, evaluation metrics logged, and a model card written to disk.
        </div>
      </div>
    ),
  },
  {
    id: 'tut-rag',
    icon: <GraduationCap size={15} />,
    title: '2. RAG Chatbot (Chroma + OpenAI)',
    group: 'Tutorials',
    content: (
      <div className="space-y-3">
        <DevBanner />
        <p className="font-semibold text-foreground">Build a Retrieval-Augmented Generation chatbot backed by Chroma and GPT-4o.</p>
        <p className="text-[11px] text-muted-foreground">Prerequisites: an OpenAI API key stored in the Secrets Vault (Settings → Secrets → add <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">OPENAI_API_KEY</code>).</p>
        <ol className="space-y-3 list-none">
          <Step n={1} title="Switch to LLM Pipeline">
            Click <strong className="text-foreground">LLM Pipeline</strong> in the top nav.
          </Step>
          <Step n={2} title="Ingest a PDF">
            Drag <strong className="text-foreground">PDF Loader</strong> (Ingest). In the Inspector, upload your PDF via the ↑ button or enter a file path. Set <em>Page Range</em> if needed.
          </Step>
          <Step n={3} title="Chunk the text">
            Drag <strong className="text-foreground">Recursive Text Splitter</strong> (Chunk). Connect PDF Loader → Splitter. Set <em>Chunk Size</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">512</code> and <em>Overlap</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">64</code>.
          </Step>
          <Step n={4} title="Embed with OpenAI">
            Drag <strong className="text-foreground">OpenAI Embeddings</strong> (Embed). Connect Splitter → Embeddings. The <em>API Key Env Var</em> field pre-fills with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">OPENAI_API_KEY</code> from your vault.
          </Step>
          <Step n={5} title="Store in Chroma">
            Drag <strong className="text-foreground">Chroma</strong> (VectorStore). Connect Embeddings → Chroma. Set <em>Collection Name</em>. Enable <em>Persist</em> to save the vector store to disk.
          </Step>
          <Step n={6} title="Add an LLM node">
            Drag <strong className="text-foreground">OpenAI Chat</strong> (LLM). Set <em>Model</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">gpt-4o</code> and <em>Temperature</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">0</code>.
          </Step>
          <Step n={7} title="Wire the RAG Chain">
            Drag <strong className="text-foreground">RAG Chain</strong> (Chain). Connect Chroma → RAG Chain (VectorStore input) and OpenAI Chat → RAG Chain (LLM input). Customize the <em>Prompt Template</em> in the Inspector.
          </Step>
          <Step n={8} title="Test with Prompt Playground">
            Click the RAG Chain node → Inspector → <strong className="text-foreground">Playground</strong> tab. Type a question and click <strong className="text-foreground">Run</strong>. See streamed response with retrieved chunks below.
          </Step>
          <Step n={9} title="Debug retrieval quality">
            Switch to the <strong className="text-foreground">Debug</strong> tab. Enter the same question. Review similarity scores for the top-K chunks. If scores are low, increase Chunk Size or decrease Overlap in the Splitter node.
          </Step>
          <Step n={10} title="Deploy as LangServe endpoint">
            Drag <strong className="text-foreground">LangServe Deploy</strong> (Deploy). Connect RAG Chain → LangServe. Set <em>App Title</em> and <em>Port</em>. Generate Python script and run locally — a FastAPI server with a <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">/rag/invoke</code> endpoint starts on the configured port.
          </Step>
        </ol>
        <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-[11px] text-green-300">
          ✓ Result: A running RAG API endpoint backed by Chroma that answers questions from your PDF.
        </div>
      </div>
    ),
  },
  {
    id: 'tut-finetune',
    icon: <GraduationCap size={15} />,
    title: '3. LoRA Fine-tuning → HuggingFace',
    group: 'Tutorials',
    content: (
      <div className="space-y-3">
        <DevBanner />
        <p className="font-semibold text-foreground">Fine-tune a language model with LoRA/QLoRA and push the merged weights to HuggingFace Hub.</p>
        <p className="text-[11px] text-muted-foreground">Prerequisites: HF_TOKEN in the Secrets Vault; a GPU available for training.</p>
        <ol className="space-y-3 list-none">
          <Step n={1} title="Switch to LLM Pipeline">
            Click <strong className="text-foreground">LLM Pipeline</strong> in the top nav.
          </Step>
          <Step n={2} title="Add a Dataset Prep node">
            Drag <strong className="text-foreground">HuggingFace Dataset</strong> (Ingest). Set <em>Dataset Name</em> to your instruction-tuning dataset (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">tatsu-lab/alpaca</code>). Set <em>Split</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">train</code>.
          </Step>
          <Step n={3} title="Add Dataset Prep (Fine-tune)">
            Drag <strong className="text-foreground">Dataset Prep</strong> (Fine-tune category). Connect HF Dataset → Dataset Prep. Set <em>Prompt Column</em> and <em>Completion Column</em> to match your dataset schema. Set <em>Max Sequence Length</em>.
          </Step>
          <Step n={4} title="Configure LoRA">
            Drag <strong className="text-foreground">LoRA / QLoRA Config</strong> (Fine-tune). Connect Dataset Prep → LoRA Config. Set <em>Base Model</em> (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">meta-llama/Llama-3-8B</code>), <em>r</em> (rank), and enable <em>QLoRA (4-bit)</em> for lower VRAM usage.
          </Step>
          <Step n={5} title="Add SFT Trainer">
            Drag <strong className="text-foreground">SFT Trainer</strong> (Fine-tune). Connect LoRA Config → SFT Trainer. Set <em>Epochs</em>, <em>Batch Size</em>, <em>Learning Rate</em>. Enable <em>MLflow logging</em> to track loss curves.
          </Step>
          <Step n={6} title="Merge and push">
            Drag <strong className="text-foreground">Merge &amp; Push to Hub</strong> (Fine-tune). Connect SFT Trainer → Merge. Set <em>Hub Repo ID</em> (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">your-username/llama-3-finetuned</code>). The <em>HF Token</em> field is pre-filled from the vault.
          </Step>
          <Step n={7} title="Generate and run">
            Click <strong className="text-foreground">Code → Generate</strong> then <strong className="text-foreground">Run → Run Locally</strong>. Training logs stream into the Log Panel. After completion, the merged model is pushed to the Hub automatically.
          </Step>
          <Step n={8} title="Verify on HuggingFace">
            Open your HuggingFace profile — the new model repository should be visible. The generated code also produces a <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">MODEL_CARD.md</code> that is uploaded alongside the weights.
          </Step>
        </ol>
        <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-[11px] text-green-300">
          ✓ Result: A LoRA-fine-tuned model with merged weights hosted on HuggingFace Hub.
        </div>
      </div>
    ),
  },
  {
    id: 'tut-azure',
    icon: <GraduationCap size={15} />,
    title: '4. Deploy to Azure ML',
    group: 'Tutorials',
    content: (
      <div className="space-y-3">
        <DevBanner />
        <p className="font-semibold text-foreground">Build an ML pipeline locally and deploy it as an Azure ML job and managed endpoint.</p>
        <p className="text-[11px] text-muted-foreground">Prerequisites: an Azure subscription with an ML workspace; Client ID / Secret / Tenant ID stored in the Secrets Vault.</p>
        <ol className="space-y-3 list-none">
          <Step n={1} title="Build your ML pipeline">
            Build any complete ML pipeline on the canvas — at minimum: Ingest → Train → Evaluate → Deploy node.
          </Step>
          <Step n={2} title="Store Azure credentials">
            Open <strong className="text-foreground">Settings → Secrets</strong>. Add secrets: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">AZURE_CLIENT_ID</code>, <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">AZURE_CLIENT_SECRET</code>, <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">AZURE_TENANT_ID</code>.
          </Step>
          <Step n={3} title="Open Cloud Deployment">
            Click the <strong className="text-foreground">Cloud</strong> icon (upload-cloud) in the top-right toolbar. The Azure tab opens by default.
          </Step>
          <Step n={4} title="Configure workspace">
            Fill in <em>Subscription ID</em>, <em>Resource Group</em>, <em>Workspace Name</em>, and <em>Tenant ID</em>. Click <strong className="text-foreground">Save &amp; Test</strong> — a green ✓ badge confirms the connection. If it fails, check your service principal has <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">Contributor</code> role on the workspace.
          </Step>
          <Step n={5} title="Submit a pipeline job">
            Under <em>Pipeline Job</em>, set <em>Compute Target</em> (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">cpu-cluster</code>) and <em>Experiment Name</em>. Click <strong className="text-foreground">Submit Job</strong>. The job ID appears with a live status badge (Submitted → Running → Completed).
          </Step>
          <Step n={6} title="Deploy as a real-time endpoint">
            Under <em>Deploy Endpoint</em>, set <em>Endpoint Name</em>, <em>Model Name</em>, and <em>Instance Type</em> (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">Standard_DS3_v2</code>). Click <strong className="text-foreground">Deploy</strong>. Deployment typically takes 5–10 minutes; the status polls automatically.
          </Step>
          <Step n={7} title="Test the endpoint">
            Once deployed, copy the endpoint URI from the status section. Test with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">curl</code>:
            <pre className="mt-1 rounded bg-muted p-1.5 font-mono text-[9px] text-foreground overflow-x-auto">{`curl -X POST https://<endpoint>.azureml.net/score \\
  -H "Authorization: Bearer <key>" \\
  -H "Content-Type: application/json" \\
  -d '{"data": [[5.1, 3.5, 1.4, 0.2]]}'`}</pre>
          </Step>
        </ol>
        <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-[11px] text-green-300">
          ✓ Result: Your pipeline runs as an Azure ML job and the trained model is served via a managed real-time endpoint.
        </div>
      </div>
    ),
  },
  {
    id: 'tut-langgraph',
    icon: <GraduationCap size={15} />,
    title: '5. LangGraph Multi-Agent Pipeline',
    group: 'Tutorials',
    content: (
      <div className="space-y-3">
        <DevBanner />
        <p className="font-semibold text-foreground">Build and deploy a stateful multi-step LLM agent using LangGraph with tool use and a retrieval step.</p>
        <p className="text-[11px] text-muted-foreground">Prerequisites: OPENAI_API_KEY in the Secrets Vault.</p>
        <ol className="space-y-3 list-none">
          <Step n={1} title="Switch to LLM Pipeline">
            Click <strong className="text-foreground">LLM Pipeline</strong> in the top nav.
          </Step>
          <Step n={2} title="Add an OpenAI LLM node">
            Drag <strong className="text-foreground">OpenAI Chat</strong> (LLM). Set <em>Model</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">gpt-4o</code>. Leave Temperature at default.
          </Step>
          <Step n={3} title="Add a LangGraph Workflow node">
            Drag <strong className="text-foreground">LangGraph Workflow</strong> (Chain). Connect OpenAI Chat → LangGraph. In the Inspector, set <em>Workflow Type</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">multi_agent</code> and <em>Checkpointer</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">memory</code>. The workflow will manage state across multiple agent steps.
          </Step>
          <Step n={4} title="Add a ReAct Agent for tool use">
            Drag <strong className="text-foreground">ReAct Agent</strong> (Chain). Connect OpenAI Chat → ReAct Agent. Enable tools: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">web_search</code>, <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">calculator</code>. Set <em>Max Iterations</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">5</code>.
          </Step>
          <Step n={5} title="Use the Prompt Playground">
            Click the LangGraph Workflow node → <strong className="text-foreground">Playground</strong> tab. Enter a multi-step query like <em>"Research the top 3 open-source LLMs by parameter count and rank them by inference speed."</em> Click <strong className="text-foreground">Run</strong> to see the agent's chain-of-thought response stream in.
          </Step>
          <Step n={6} title="Add an A/B Split to compare agent configs">
            Drag an <strong className="text-foreground">A/B Split</strong> node (LLM category) between the OpenAI LLM node and two separate ReAct Agent nodes. Configure Branch A with <em>Max Iterations = 5</em> and Branch B with <em>Max Iterations = 10</em>. Both branches run in parallel.
          </Step>
          <Step n={7} title="Run and view the Leaderboard">
            Click <strong className="text-foreground">Run → Run Locally</strong>. After completion, open the <strong className="text-foreground">Runs</strong> panel (bar chart icon). Both A/B branches appear with their respective metrics. Select them and click <strong className="text-foreground">Compare</strong> to see the config diff.
          </Step>
          <Step n={8} title="Deploy to LangServe">
            Drag <strong className="text-foreground">LangServe Deploy</strong> (Deploy). Connect LangGraph Workflow → LangServe. Set <em>Port</em> to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">8080</code>. Generate and run — access the agent at <code className="rounded bg-muted px-1 py-0.5 font-mono text-[9px]">http://localhost:8080/workflow/invoke</code>.
          </Step>
        </ol>
        <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-[11px] text-green-300">
          ✓ Result: A stateful LangGraph multi-agent pipeline with tool use deployed as a LangServe endpoint. A/B comparison shows which agent config produces better results.
        </div>
      </div>
    ),
  },
]

export function HelpPage() {
  const [active, setActive] = useState('getting-started')
  const current = (sections.find((s) => s.id === active) ?? sections[0])!

  const groups = Array.from(new Set(sections.map((s) => s.group ?? 'Reference')))

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <BookOpen size={13} className="text-primary" />
          <span className="text-xs font-semibold">Documentation</span>
        </div>
        <ScrollArea className="flex-1">
          <nav className="space-y-0.5 p-2">
            {groups.map((group) => (
              <div key={group}>
                <p className="mt-2 mb-0.5 px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{group}</p>
                {sections
                  .filter((s) => (s.group ?? 'Reference') === group)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] transition-colors ${
                        active === s.id
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <span className={active === s.id ? 'text-primary' : 'text-muted-foreground'}>
                        {s.icon}
                      </span>
                      {s.title}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
          <span className="text-primary">{current.icon}</span>
          <h1 className="text-sm font-semibold">{current.title}</h1>
          {(current.group === 'Tutorials') && (
            <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">TUTORIAL</span>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="max-w-2xl p-6 text-[12px] text-muted-foreground leading-relaxed">
            {current.content}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
