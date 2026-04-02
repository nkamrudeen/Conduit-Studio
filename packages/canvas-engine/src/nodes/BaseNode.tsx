import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { PipelineNode, NodeDefinition, PortType, NodeOutputPreview } from '@ai-ide/types'
import { PORT_TYPE_COLORS } from '../utils/dagUtils'

interface BaseNodeData extends PipelineNode {
  definition?: NodeDefinition
}

// ── Inline preview renderers ──────────────────────────────────────────────────

function DataFramePreview({ out }: { out: NodeOutputPreview }) {
  const cols = out.columns?.slice(0, 4) ?? []
  const rows = out.rows?.slice(0, 3) ?? []
  const truncated = (out.columns?.length ?? 0) > 4
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 2 }}>
        DataFrame {out.shape?.[0].toLocaleString()} × {out.shape?.[1]}
        {truncated ? ` (${out.columns?.length} cols)` : ''}
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 4, background: '#0a0f1e', border: '1px solid #1e293b' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 8, width: '100%', minWidth: cols.length * 48 }}>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c} style={{ padding: '1px 4px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #1e293b', textAlign: 'left', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</th>
              ))}
              {truncated && <th style={{ padding: '1px 4px', color: '#475569' }}>…</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {cols.map((c) => (
                  <td key={c} style={{ padding: '1px 4px', color: '#64748b', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(row[c] ?? '')}
                  </td>
                ))}
                {truncated && <td style={{ color: '#334155' }}>…</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModelPreview({ out }: { out: NodeOutputPreview }) {
  return (
    <div style={{ fontSize: 9, color: '#a78bfa', marginTop: 4, padding: '2px 4px', background: '#1e1b4b', borderRadius: 3 }}>
      🤖 {out.className ?? 'Model'}
    </div>
  )
}

function MetricsPreview({ out }: { out: NodeOutputPreview }) {
  const entries = Object.entries(out.value as Record<string, number>).slice(0, 4)
  return (
    <div style={{ marginTop: 4, fontSize: 9 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span style={{ color: '#64748b' }}>{k}</span>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
        </div>
      ))}
    </div>
  )
}

function OutputPreview({ outputs, durationMs }: { outputs: NodeOutputPreview[]; durationMs?: number }) {
  const first = outputs[0]
  if (!first) return null
  return (
    <div style={{ borderTop: '1px solid #1e293b', marginTop: 6, paddingTop: 4 }}>
      {first.type === 'DataFrame' && <DataFramePreview out={first} />}
      {first.type === 'Model' && <ModelPreview out={first} />}
      {first.type === 'Metrics' && <MetricsPreview out={first} />}
      {first.type === 'Text' && (
        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, wordBreak: 'break-all' }}>
          {String(first.value).slice(0, 120)}{String(first.value).length > 120 ? '…' : ''}
        </div>
      )}
      {durationMs !== undefined && (
        <div style={{ fontSize: 8, color: '#334155', marginTop: 2, textAlign: 'right' }}>
          {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'transparent',
  running: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
}

export function BaseNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData
  const { definition, status = 'idle', result } = nodeData
  const headerColor = definition?.color ?? '#6366f1'
  const ringColor = STATUS_COLORS[status] ?? 'transparent'

  return (
    <div
      style={{
        minWidth: 180,
        borderRadius: 8,
        border: `2px solid ${selected ? headerColor : ringColor !== 'transparent' ? ringColor : '#334155'}`,
        backgroundColor: '#0f172a',
        boxShadow: selected
          ? `0 0 0 2px ${headerColor}44, 0 4px 12px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
        outline: status !== 'idle' ? `2px solid ${ringColor}` : undefined,
        transition: 'box-shadow 0.15s, border-color 0.15s',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Input handles — coloured by port type */}
      {definition?.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          title={`${port.label} (${port.type})`}
          style={{
            top: 32 + i * 22,
            width: 10,
            height: 10,
            background: PORT_TYPE_COLORS[port.type as PortType] ?? '#64748b',
            border: '2px solid #0f172a',
          }}
        />
      ))}

      {/* Header */}
      <div
        style={{
          background: headerColor,
          borderRadius: '6px 6px 0 0',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{definition?.icon ?? '🔲'}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {definition?.label ?? nodeData.definitionId}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '6px 10px 8px' }}>
        {/* Port type labels */}
        {definition?.inputs.map((port) => (
          <div
            key={port.id}
            style={{ fontSize: 9, color: '#64748b', marginBottom: 1 }}
          >
            ← {port.label}
          </div>
        ))}
        <p
          style={{
            fontSize: 10,
            color: '#94a3b8',
            margin: '4px 0 0',
            lineHeight: 1.4,
          }}
        >
          {definition?.description ?? ''}
        </p>
        {status === 'error' && nodeData.error && (
          <p style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>{nodeData.error}</p>
        )}
        {status === 'running' && (
          <p style={{ fontSize: 10, color: '#3b82f6', marginTop: 4 }}>⏳ Running…</p>
        )}
        {status === 'success' && !result && (
          <p style={{ fontSize: 10, color: '#22c55e', marginTop: 4 }}>✓ Done</p>
        )}
        {result && result.outputs.length > 0 && (
          <OutputPreview outputs={result.outputs} durationMs={result.durationMs} />
        )}
      </div>

      {/* Port type labels (outputs) */}
      {definition?.outputs.map((port) => (
        <div
          key={port.id}
          style={{ fontSize: 9, color: '#64748b', textAlign: 'right', paddingRight: 10, paddingBottom: 2 }}
        >
          {port.label} →
        </div>
      ))}

      {/* Output handles — coloured by port type */}
      {definition?.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          title={`${port.label} (${port.type})`}
          style={{
            top: 32 + i * 22,
            width: 10,
            height: 10,
            background: PORT_TYPE_COLORS[port.type as PortType] ?? headerColor,
            border: '2px solid #0f172a',
          }}
        />
      ))}
    </div>
  )
}
