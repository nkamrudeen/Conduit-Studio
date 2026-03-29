import React, { useEffect, useState } from 'react'
import { nodeRegistry } from '@ai-ide/node-registry'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { ScrollArea, Badge } from '@ai-ide/ui'
import { CheckCircle2, XCircle, Loader2, Table } from 'lucide-react'
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
      const res = await fetch('/api/connectors/test', {
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
      const res = await fetch('/api/connectors/preview?n_rows=20', {
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
          {schema.properties &&
            Object.entries(schema.properties).map(([key, propDef]) => (
              <FormField
                key={key}
                fieldKey={key}
                schema={propDef as JSONSchema7}
                required={(schema.required ?? []).includes(key)}
                value={config[key]}
                onChange={(v) => handleChange(key, v)}
              />
            ))}

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

interface FormFieldProps {
  fieldKey: string
  schema: JSONSchema7
  required: boolean
  value: unknown
  onChange: (v: unknown) => void
}

function FormField({ fieldKey, schema, required, value, onChange }: FormFieldProps) {
  const label = (schema.title ?? fieldKey) + (required ? ' *' : '')

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
