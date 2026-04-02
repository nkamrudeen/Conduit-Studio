import React, { useCallback, useEffect, useRef, useState } from 'react'
import { nodeRegistry } from '@ai-ide/node-registry'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { ScrollArea, Badge } from '@ai-ide/ui'
import { CheckCircle2, XCircle, Loader2, Table, Upload, FileCheck, X, RefreshCw } from 'lucide-react'
import { getApiBase } from '../../lib/api'
import { getNodeIntegrationDefaults } from '../../lib/integrations'
import { useProjectStore } from '../../store/projectStore'
import type { JSONSchema7 } from 'json-schema'

// Map node definitionId prefix → connector_id used by the backend API
const CONNECTOR_MAP: Record<string, string> = {
  'ml.ingest.csv': 'local',
  'ml.ingest.parquet': 'local',
  'ml.ingest.s3': 's3',
  'ml.ingest.azure': 'azure',
  'ml.ingest.gcs': 'gcs',
  'ml.ingest.postgres': 'postgres',
  'ml.ingest.huggingface': 'local',
  'llm.ingest.s3_docs': 's3',
}

export function NodeInspector() {
  const { dag, selectedNodeId, updateNodeConfig } = usePipelineStore()
  const node = dag.nodes.find((n) => n.id === selectedNodeId)
  const definition = node ? nodeRegistry.get(node.definitionId) : undefined

  const [config, setConfig] = useState<Record<string, unknown>>(node?.config ?? {})
  const [connTest, setConnTest] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [preview, setPreview] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    setConfig(node?.config ?? {})
    setConnTest('idle')
    setPreview(null)
  }, [selectedNodeId, node])

  if (!node || !definition) {
    return (
      <aside data-testid="node-inspector" className="flex h-full w-72 shrink-0 flex-col items-center justify-center border-l border-border bg-card text-muted-foreground">
        <p className="text-xs">Select a node to configure it</p>
      </aside>
    )
  }

  const handleChange = (key: string, value: unknown) => {
    const next = { ...config, [key]: value }
    setConfig(next)
    updateNodeConfig(node.id, next)
  }

  const connectorId = CONNECTOR_MAP[node.definitionId]
  const isIngestNode = definition.category === 'ingest' && !!connectorId

  const testConnection = async () => {
    setConnTest('loading')
    try {
      const res = await fetch(`${getApiBase()}/connectors/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_id: connectorId, config }),
      })
      const data = await res.json()
      setConnTest(data.success ? 'ok' : 'fail')
    } catch {
      setConnTest('fail')
    }
  }

  const previewData = async () => {
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch(`${getApiBase()}/connectors/preview?n_rows=20`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_id: connectorId, config }),
      })
      const data = await res.json()
      setPreview(data)
    } catch {
      // ignore — backend may not be running
    } finally {
      setPreviewLoading(false)
    }
  }

  const schema = definition.configSchema as JSONSchema7

  return (
    <aside data-testid="node-inspector" className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-lg">{definition.icon}</span>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-xs font-semibold">{definition.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">{definition.id}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {definition.pipeline.toUpperCase()}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-3">
          <p className="text-[11px] text-muted-foreground">{definition.description}</p>

          {/* Config form */}
          {schema.properties && (() => {
            const integrationDefaults = getNodeIntegrationDefaults(node.definitionId)
            const remoteFields = REMOTE_OPTIONS[node.definitionId] ?? {}
            return Object.entries(schema.properties).map(([key, propDef]) => {
              const remoteDef = remoteFields[key]
              const isFromIntegration = key in integrationDefaults
              const fieldLabel = (
                <span className="flex items-center gap-1">
                  {((propDef as JSONSchema7).title ?? key)}{(schema.required ?? []).includes(key) ? ' *' : ''}
                  {isFromIntegration && (
                    <span title="Pre-filled from Integrations settings" className="rounded bg-blue-500/20 px-1 py-0 text-[9px] font-semibold text-blue-400">
                      integration
                    </span>
                  )}
                </span>
              )
              if (remoteDef) {
                return (
                  <RemoteOptionsField
                    key={key}
                    fieldKey={key}
                    label={fieldLabel}
                    value={String(config[key] ?? '')}
                    config={config}
                    optionsDef={remoteDef}
                    onChange={(v) => handleChange(key, v)}
                  />
                )
              }
              return (
                <FormField
                  key={key}
                  fieldKey={key}
                  schema={propDef as JSONSchema7}
                  required={(schema.required ?? []).includes(key)}
                  value={config[key]}
                  fromIntegration={isFromIntegration}
                  onChange={(v) => handleChange(key, v)}
                />
              )
            })
          })()}

          {/* Connector actions (ingest nodes only) */}
          {isIngestNode && (
            <div className="space-y-2 rounded-md border border-border p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data Source</p>
              <div className="flex gap-1.5">
                <button
                  onClick={testConnection}
                  disabled={connTest === 'loading'}
                  className="flex flex-1 items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-60"
                >
                  {connTest === 'loading' && <Loader2 size={10} className="animate-spin" />}
                  {connTest === 'ok' && <CheckCircle2 size={10} className="text-green-500" />}
                  {connTest === 'fail' && <XCircle size={10} className="text-red-500" />}
                  {connTest === 'idle' && null}
                  Test Connection
                </button>
                <button
                  onClick={previewData}
                  disabled={previewLoading}
                  className="flex flex-1 items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-60"
                >
                  {previewLoading ? <Loader2 size={10} className="animate-spin" /> : <Table size={10} />}
                  Preview
                </button>
              </div>

              {/* Preview table */}
              {preview && preview.rows.length > 0 && (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-[10px]">
                    <thead className="bg-muted">
                      <tr>
                        {preview.columns.map((col) => (
                          <th key={col} className="border-r border-border px-1.5 py-1 text-left font-medium last:border-r-0">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border even:bg-muted/30">
                          {preview.columns.map((col) => (
                            <td key={col} className="max-w-[60px] truncate border-r border-border px-1.5 py-0.5 last:border-r-0">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Port info */}
          {definition.inputs.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Inputs</p>
              {definition.inputs.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-[11px]">
                  <span>{p.label}</span>
                  <Badge variant="secondary" className="text-[9px]">{p.type}</Badge>
                </div>
              ))}
            </div>
          )}
          {definition.outputs.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outputs</p>
              {definition.outputs.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-[11px]">
                  <span>{p.label}</span>
                  <Badge variant="secondary" className="text-[9px]">{p.type}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Required packages */}
          {definition.requiredPackages.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pip Packages</p>
              <div className="flex flex-wrap gap-1">
                {definition.requiredPackages.map((pkg) => (
                  <Badge key={pkg} variant="outline" className="text-[9px]">{pkg}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Remote options — live fetch from backend for select-like fields
// ---------------------------------------------------------------------------

interface RemoteOptionsDef {
  /** Backend path (without /api prefix). Receives the current node config. */
  endpoint: (config: Record<string, unknown>) => string | null
  /** Map one response item to a display label + value */
  toOption: (item: Record<string, unknown>) => { label: string; value: string }
  /** Whether to re-fetch when the user types (search mode) vs fetch once */
  searchMode?: boolean
}

/**
 * Maps  definitionId → fieldKey → remote options config.
 * Only fields listed here get the live-fetch combobox treatment.
 */
const REMOTE_OPTIONS: Record<string, Record<string, RemoteOptionsDef>> = {
  // ── MLflow nodes ──────────────────────────────────────────────────────────
  'ml.mlflow.set_experiment': {
    experiment_name: {
      endpoint: (c) => {
        const uri = (c.tracking_uri as string) || 'http://localhost:5000'
        return `/mlflow/experiments?tracking_uri=${encodeURIComponent(uri)}`
      },
      toOption: (i) => ({ label: i.name as string, value: i.name as string }),
    },
  },
  'ml.deploy.mlflow': {
    experiment_name: {
      endpoint: (c) => {
        const uri = (c.mlflow_tracking_uri as string) || 'http://localhost:5000'
        return `/mlflow/experiments?tracking_uri=${encodeURIComponent(uri)}`
      },
      toOption: (i) => ({ label: i.name as string, value: i.name as string }),
    },
    model_name: {
      endpoint: (c) => {
        const uri = (c.mlflow_tracking_uri as string) || 'http://localhost:5000'
        return `/mlflow/models?tracking_uri=${encodeURIComponent(uri)}`
      },
      toOption: (i) => ({ label: i.name as string, value: i.name as string }),
    },
  },
  'ml.mlflow.load_model': {
    model_name: {
      endpoint: (c) => {
        const uri = (c.tracking_uri as string) || 'http://localhost:5000'
        return `/mlflow/models?tracking_uri=${encodeURIComponent(uri)}`
      },
      toOption: (i) => ({ label: i.name as string, value: i.name as string }),
    },
  },
  'ml.mlflow.compare_runs': {
    experiment_name: {
      endpoint: (c) => {
        const uri = (c.tracking_uri as string) || 'http://localhost:5000'
        return `/mlflow/experiments?tracking_uri=${encodeURIComponent(uri)}`
      },
      toOption: (i) => ({ label: i.name as string, value: i.name as string }),
    },
  },
  // ── HuggingFace ingest ────────────────────────────────────────────────────
  'ml.ingest.huggingface': {
    dataset_name: {
      endpoint: (c) => {
        const q = (c.dataset_name as string) || ''
        const saved = JSON.parse(localStorage.getItem('conduitcraft:integrations') ?? '{}')
        const tok: string = saved['HuggingFace Hub']?.token ?? ''
        return `/huggingface/datasets?query=${encodeURIComponent(q)}&limit=15${tok ? `&token=${encodeURIComponent(tok)}` : ''}`
      },
      toOption: (i) => ({ label: i.id as string, value: i.id as string }),
      searchMode: true,
    },
  },
  // ── HuggingFace embed ─────────────────────────────────────────────────────
  'llm.embed.huggingface': {
    model_name: {
      endpoint: (c) => {
        const q = (c.model_name as string) || 'sentence-transformers'
        const saved = JSON.parse(localStorage.getItem('conduitcraft:integrations') ?? '{}')
        const tok: string = saved['HuggingFace Hub']?.token ?? ''
        return `/huggingface/models?query=${encodeURIComponent(q)}&task=feature-extraction&limit=15${tok ? `&token=${encodeURIComponent(tok)}` : ''}`
      },
      toOption: (i) => ({ label: i.modelId as string, value: i.modelId as string }),
      searchMode: true,
    },
  },
}

// Shared: all MLflow tracking nodes with experiment_name + tracking_uri
for (const id of ['ml.mlflow.autolog', 'ml.mlflow.log_params']) {
  const expDef = REMOTE_OPTIONS['ml.mlflow.set_experiment']?.experiment_name
  if (expDef) {
    REMOTE_OPTIONS[id] = { experiment_name: expDef }
  }
}

// ---------------------------------------------------------------------------
// RemoteOptionsField — text input with a live-fetched dropdown
// ---------------------------------------------------------------------------

interface RemoteOptionsFieldProps {
  label: React.ReactNode
  fieldKey: string
  value: string
  config: Record<string, unknown>
  optionsDef: RemoteOptionsDef
  onChange: (v: string) => void
}

function RemoteOptionsField({ label, value, config, optionsDef, onChange }: RemoteOptionsFieldProps) {
  const [options, setOptions] = useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const fetchOptions = useCallback(async (currentConfig: Record<string, unknown>) => {
    const path = optionsDef.endpoint(currentConfig)
    if (!path) return
    setLoading(true)
    try {
      const res = await fetch(`${getApiBase()}${path}`)
      if (!res.ok) return
      const data = await res.json() as Record<string, unknown>[]
      setOptions(data.map(optionsDef.toOption))
    } catch {
      // silently ignore — network may not be up yet
    } finally {
      setLoading(false)
    }
  }, [optionsDef])

  // Fetch on mount (non-search mode) or when dependent config changes
  useEffect(() => {
    if (!optionsDef.searchMode) {
      fetchOptions(config)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsDef.searchMode])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (v: string) => {
    onChange(v)
    if (optionsDef.searchMode) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchOptions({ ...config, [fieldKey]: v }), 400)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="mb-0.5 flex items-center justify-between">
        <label className="text-[11px] font-medium">{label}</label>
        {!optionsDef.searchMode && (
          <button
            onClick={() => { fetchOptions(config); setOpen(true) }}
            className="text-muted-foreground hover:text-foreground"
            title="Refresh options from server"
          >
            {loading ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
          </button>
        )}
      </div>
      <input
        type="text"
        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={String(value ?? '')}
        placeholder={loading ? 'Loading…' : 'Type or select…'}
        onFocus={() => { setOpen(true); if (options.length === 0) fetchOptions(config) }}
        onChange={(e) => { handleChange(e.target.value); setOpen(true) }}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-50 mt-0.5 max-h-44 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {options
            .filter((o) => !value || o.label.toLowerCase().includes(String(value).toLowerCase()))
            .map((o) => (
              <li
                key={o.value}
                className="cursor-pointer px-2 py-1 text-xs hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false) }}
              >
                {o.label}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

interface FormFieldProps {
  fieldKey: string
  schema: JSONSchema7
  required: boolean
  value: unknown
  fromIntegration?: boolean
  onChange: (v: unknown) => void
}

function FormField({ fieldKey, schema, required, value, fromIntegration, onChange }: FormFieldProps) {
  const baseLabel = (schema.title ?? fieldKey) + (required ? ' *' : '')
  const label: React.ReactNode = fromIntegration ? (
    <span className="flex items-center gap-1">
      {baseLabel}
      <span title="Pre-filled from Integrations settings" className="rounded bg-blue-500/20 px-1 py-0 text-[9px] font-semibold text-blue-400">
        integration
      </span>
    </span>
  ) : baseLabel

  if (schema.enum) {
    return (
      <div>
        <label className="mb-0.5 block text-[11px] font-medium">{label}</label>
        <select
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={String(value ?? schema.default ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {(schema.enum as string[]).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {schema.description && <p className="mt-0.5 text-[10px] text-muted-foreground">{schema.description}</p>}
      </div>
    )
  }

  if (schema.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={fieldKey}
          className="h-3.5 w-3.5 rounded accent-primary"
          checked={Boolean(value ?? schema.default)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={fieldKey} className="text-[11px] font-medium">{label}</label>
      </div>
    )
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return (
      <div>
        <label className="mb-0.5 block text-[11px] font-medium">{label}</label>
        <input
          type="number"
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={String(value ?? schema.default ?? '')}
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === 'integer' ? 1 : 'any'}
          onChange={(e) => onChange(schema.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
        />
      </div>
    )
  }

  // file_path fields get a dedicated upload widget
  if (fieldKey === 'file_path') {
    return <FilePathField label={label} value={String(value ?? '')} onChange={onChange} />
  }

  const isLong = (schema.description?.length ?? 0) > 40 || fieldKey.includes('prompt') || fieldKey.includes('query')
  return (
    <div>
      <label className="mb-0.5 block text-[11px] font-medium">{label}</label>
      {isLong ? (
        <textarea
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={String(value ?? schema.default ?? '')}
          placeholder={schema.description}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={String(value ?? schema.default ?? '')}
          placeholder={schema.description}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilePathField — file upload widget for file_path config properties
// ---------------------------------------------------------------------------

interface FilePathFieldProps {
  label: React.ReactNode
  value: string
  onChange: (v: string) => void
}

function FilePathField({ label, value, onChange }: FilePathFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { projectFolder } = useProjectStore()

  // If the value already looks like an uploaded server path, show the filename.
  const displayName = uploadedName ?? (value ? value.split(/[\\/]/).pop() ?? value : null)

  /** Read a File into an ArrayBuffer, trying arrayBuffer() first and falling
   *  back to FileReader if the handle has been invalidated (Windows NotFoundError). */
  const readFile = (file: File): Promise<ArrayBuffer> =>
    file.arrayBuffer().catch(() =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
      })
    )

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const buffer = await readFile(file)
      const blob = new Blob([buffer], { type: file.type || 'application/octet-stream' })
      const form = new FormData()
      form.append('file', blob, file.name)
      if (projectFolder) form.append('project_folder', projectFolder)
      const res = await fetch(`${getApiBase()}/files/upload`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as { server_path: string; filename: string }
      onChange(data.server_path)
      setUploadedName(data.filename)
    } catch (e) {
      setError(`Upload failed: ${String(e)}`)
    } finally {
      setUploading(false)
    }
  }

  const clearUpload = () => {
    onChange('')
    setUploadedName(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <label className="mb-0.5 block text-[11px] font-medium">{label}</label>

      {/* Uploaded file badge */}
      {uploadedName && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-green-500/40 bg-green-500/10 px-2 py-1">
          <FileCheck size={11} className="shrink-0 text-green-400" />
          <span className="flex-1 truncate text-[10px] text-green-300">{uploadedName}</span>
          <button onClick={clearUpload} className="text-muted-foreground hover:text-foreground">
            <X size={10} />
          </button>
        </div>
      )}

      {/* Manual path input */}
      <div className="flex gap-1">
        <input
          type="text"
          className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={value}
          placeholder="Path or upload a file →"
          onChange={(e) => { onChange(e.target.value); setUploadedName(null) }}
        />
        <button
          title="Upload a local file"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.parquet,.tsv,.json,.jsonl,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="mt-0.5 text-[10px] text-destructive">{error}</p>}
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        Uploaded files are stored server-side and auto-bundled in Docker builds.
      </p>
    </div>
  )
}
