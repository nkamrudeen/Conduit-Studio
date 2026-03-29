import React, { useState } from 'react'
import { Puzzle, Download, Trash2, ToggleLeft, ToggleRight, ExternalLink, RefreshCw } from 'lucide-react'

interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: 'connector' | 'node' | 'integration' | 'theme'
  nodeTypes: string[]
  enabled: boolean
  installed: boolean
  repoUrl?: string
}

const BUILTIN_PLUGINS: PluginManifest[] = [
  {
    id: 'com.aiide.connector-s3',
    name: 'S3 Connector',
    version: '1.0.0',
    description: 'AWS S3 data source nodes for ingesting CSV, Parquet, and JSON files directly from S3 buckets.',
    author: 'AI-IDE Core',
    category: 'connector',
    nodeTypes: ['s3.ingest.csv', 's3.ingest.parquet', 's3.ingest.json'],
    enabled: true,
    installed: true,
    repoUrl: 'https://github.com/ai-ide/plugins',
  },
  {
    id: 'com.aiide.connector-azure',
    name: 'Azure Blob Connector',
    version: '1.0.0',
    description: 'Azure Blob Storage connector for reading datasets from Azure containers.',
    author: 'AI-IDE Core',
    category: 'connector',
    nodeTypes: ['azure.ingest.blob'],
    enabled: true,
    installed: true,
    repoUrl: 'https://github.com/ai-ide/plugins',
  },
  {
    id: 'com.aiide.connector-gcs',
    name: 'Google Cloud Storage Connector',
    version: '1.0.0',
    description: 'GCS connector for ingesting data from Google Cloud Storage buckets.',
    author: 'AI-IDE Core',
    category: 'connector',
    nodeTypes: ['gcs.ingest.bucket'],
    enabled: false,
    installed: true,
    repoUrl: 'https://github.com/ai-ide/plugins',
  },
  {
    id: 'com.aiide.llm-openai',
    name: 'OpenAI Extended',
    version: '1.2.0',
    description: 'Extended OpenAI nodes — fine-tuning, assistants API, batch inference, and vision.',
    author: 'AI-IDE Core',
    category: 'node',
    nodeTypes: ['openai.finetune', 'openai.assistant', 'openai.vision'],
    enabled: false,
    installed: true,
    repoUrl: 'https://github.com/ai-ide/plugins',
  },
  {
    id: 'com.aiide.monitor-wandb',
    name: 'Weights & Biases',
    version: '0.9.1',
    description: 'Log experiments, metrics, and artifacts to Weights & Biases from any train or evaluate node.',
    author: 'AI-IDE Community',
    category: 'integration',
    nodeTypes: ['monitor.wandb'],
    enabled: false,
    installed: false,
    repoUrl: 'https://github.com/ai-ide/plugins',
  },
  {
    id: 'com.aiide.vectorstore-weaviate',
    name: 'Weaviate Vector Store',
    version: '1.0.0',
    description: 'Connect to Weaviate for semantic search and vector storage in LLM pipelines.',
    author: 'AI-IDE Community',
    category: 'node',
    nodeTypes: ['llm.vectorstore.weaviate'],
    enabled: false,
    installed: false,
    repoUrl: 'https://github.com/ai-ide/plugins',
  },
]

const CATEGORY_COLORS: Record<PluginManifest['category'], string> = {
  connector: 'bg-blue-500/15 text-blue-400',
  node: 'bg-violet-500/15 text-violet-400',
  integration: 'bg-amber-500/15 text-amber-400',
  theme: 'bg-green-500/15 text-green-400',
}

export function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>(BUILTIN_PLUGINS)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterInstalled, setFilterInstalled] = useState<string>('all')
  const [installing, setInstalling] = useState<string | null>(null)

  const filtered = plugins.filter((p) => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    if (filterInstalled === 'installed' && !p.installed) return false
    if (filterInstalled === 'available' && p.installed) return false
    return true
  })

  const toggleEnabled = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    )
  }

  const install = async (id: string) => {
    setInstalling(id)
    // Simulate install delay
    await new Promise((r) => setTimeout(r, 1200))
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, installed: true, enabled: true } : p))
    )
    setInstalling(null)
  }

  const uninstall = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, installed: false, enabled: false } : p))
    )
  }

  const installedCount = plugins.filter((p) => p.installed).length
  const enabledCount = plugins.filter((p) => p.enabled).length

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-foreground">Plugin Manager</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {installedCount} installed · {enabledCount} enabled
            </p>
          </div>
          <button className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw size={11} />
            Refresh Registry
          </button>
        </div>

        {/* Filters */}
        <div className="mt-3 flex gap-2">
          <div className="flex gap-1">
            {(['all', 'connector', 'node', 'integration'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={[
                  'rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            {([['all', 'All'], ['installed', 'Installed'], ['available', 'Available']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterInstalled(val)}
                className={[
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  filterInstalled === val
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plugin list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              installing={installing === plugin.id}
              onToggle={() => toggleEnabled(plugin.id)}
              onInstall={() => install(plugin.id)}
              onUninstall={() => uninstall(plugin.id)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Puzzle size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No plugins match the current filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PluginCard({
  plugin,
  installing,
  onToggle,
  onInstall,
  onUninstall,
}: {
  plugin: PluginManifest
  installing: boolean
  onToggle: () => void
  onInstall: () => void
  onUninstall: () => void
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      {/* Title row */}
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-base">
          <Puzzle size={16} className="text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">{plugin.name}</h2>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${CATEGORY_COLORS[plugin.category]}`}>
              {plugin.category}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">v{plugin.version} · {plugin.author}</p>
        </div>
        {plugin.repoUrl && (
          <a href={plugin.repoUrl} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plugin.description}</p>

      {/* Node types */}
      <div className="mt-2 flex flex-wrap gap-1">
        {plugin.nodeTypes.map((nt) => (
          <span key={nt} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {nt}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        {plugin.installed ? (
          <>
            <button
              onClick={onToggle}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {plugin.enabled ? (
                <><ToggleRight size={16} className="text-primary" /> Enabled</>
              ) : (
                <><ToggleLeft size={16} /> Disabled</>
              )}
            </button>
            <button
              onClick={onUninstall}
              className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={11} />
              Remove
            </button>
          </>
        ) : (
          <button
            onClick={onInstall}
            disabled={installing}
            className="ml-auto flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {installing ? (
              <><RefreshCw size={11} className="animate-spin" /> Installing…</>
            ) : (
              <><Download size={11} /> Install</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
