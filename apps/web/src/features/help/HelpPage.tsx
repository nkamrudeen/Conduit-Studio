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
} from 'lucide-react'

interface Section {
  id: string
  icon: React.ReactNode
  title: string
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

const sections: Section[] = [
  {
    id: 'getting-started',
    icon: <Zap size={15} />,
    title: 'Getting Started',
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
            ['Deploy', 'LangServe, FastAPI'],
            ['Monitor', 'Usage tracking via LangSmith'],
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
      </div>
    ),
  },
  {
    id: 'run',
    icon: <Play size={15} />,
    title: 'Running Pipelines',
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
      </div>
    ),
  },
  {
    id: 'data-sources',
    icon: <Database size={15} />,
    title: 'Data Sources & Connectors',
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
        <p className="text-[11px] text-muted-foreground">Use the <strong className="text-foreground">Test Connection</strong> button in the Inspector to verify credentials before running.</p>
      </div>
    ),
  },
  {
    id: 'integrations',
    icon: <GitBranch size={15} />,
    title: 'MLOps Integrations',
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
        <p className="text-muted-foreground">Configure API keys and endpoints via the <strong className="text-foreground">Integrations</strong> panel (top-right toolbar).</p>
      </div>
    ),
  },
  {
    id: 'plugins',
    icon: <Puzzle size={15} />,
    title: 'Plugin System',
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
]

export function HelpPage() {
  const [active, setActive] = useState('getting-started')
  const current = (sections.find((s) => s.id === active) ?? sections[0])!

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <BookOpen size={13} className="text-primary" />
          <span className="text-xs font-semibold">Documentation</span>
        </div>
        <ScrollArea className="flex-1">
          <nav className="space-y-0.5 p-2">
            {sections.map((s) => (
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
          </nav>
        </ScrollArea>
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
          <span className="text-primary">{current.icon}</span>
          <h1 className="text-sm font-semibold">{current.title}</h1>
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
