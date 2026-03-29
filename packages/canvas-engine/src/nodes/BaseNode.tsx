import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { PipelineNode, NodeDefinition, PortType } from '@ai-ide/types'
import { PORT_TYPE_COLORS } from '../utils/dagUtils'

interface BaseNodeData extends PipelineNode {
  definition?: NodeDefinition
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'transparent',
  running: '#3b82f6',
  success: '#22c55e',
  error: '#ef4444',
}

export function BaseNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData
  const { definition, status = 'idle' } = nodeData
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
        {status === 'success' && (
          <p style={{ fontSize: 10, color: '#22c55e', marginTop: 4 }}>✓ Done</p>
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
