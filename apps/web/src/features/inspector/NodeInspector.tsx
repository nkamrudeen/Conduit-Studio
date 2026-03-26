import React, { useEffect, useState } from 'react'
import { nodeRegistry } from '@ai-ide/node-registry'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { ScrollArea, Badge } from '@ai-ide/ui'
import type { JSONSchema7 } from 'json-schema'

export function NodeInspector() {
  const { dag, selectedNodeId, updateNodeConfig } = usePipelineStore()
  const node = dag.nodes.find((n) => n.id === selectedNodeId)
  const definition = node ? nodeRegistry.get(node.definitionId) : undefined

  const [config, setConfig] = useState<Record<string, unknown>>(node?.config ?? {})

  useEffect(() => {
    setConfig(node?.config ?? {})
  }, [selectedNodeId, node])

  if (!node || !definition) {
    return (
      <aside className="flex h-full w-72 shrink-0 flex-col items-center justify-center border-l border-border bg-card text-muted-foreground">
        <p className="text-xs">Select a node to configure it</p>
      </aside>
    )
  }

  const handleChange = (key: string, value: unknown) => {
    const next = { ...config, [key]: value }
    setConfig(next)
    updateNodeConfig(node.id, next)
  }

  const schema = definition.configSchema as JSONSchema7

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-card">
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

  // Default: string / textarea
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
