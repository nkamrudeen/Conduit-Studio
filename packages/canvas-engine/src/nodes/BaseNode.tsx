import React from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { PipelineNode, NodeDefinition } from '@ai-ide/types'
import { cn } from '@ai-ide/ui'

interface BaseNodeData extends PipelineNode {
  definition?: NodeDefinition
}

const STATUS_RING: Record<string, string> = {
  idle: 'ring-transparent',
  running: 'ring-blue-400 animate-pulse',
  success: 'ring-green-400',
  error: 'ring-red-400',
}

export function BaseNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as BaseNodeData
  const { definition, status = 'idle' } = nodeData

  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border border-border bg-card shadow-md ring-2 transition-all',
        STATUS_RING[status],
        selected && 'border-primary shadow-lg'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2"
        style={{ backgroundColor: definition?.color ?? '#6366f1' }}
      >
        <span className="text-base">{definition?.icon ?? '🔲'}</span>
        <span className="truncate text-xs font-semibold text-white">
          {definition?.label ?? nodeData.definitionId}
        </span>
      </div>

      {/* Input handles */}
      {definition?.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          title={`${port.label} (${port.type})`}
          style={{ top: `${30 + i * 20}px` }}
          className="!h-3 !w-3 !border-2 !border-card !bg-muted-foreground"
        />
      ))}

      {/* Body */}
      <div className="px-3 py-2">
        <p className="text-[10px] text-muted-foreground">{definition?.description ?? ''}</p>
        {status === 'error' && (
          <p className="mt-1 text-[10px] text-red-500">{nodeData.error}</p>
        )}
      </div>

      {/* Output handles */}
      {definition?.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          title={`${port.label} (${port.type})`}
          style={{ top: `${30 + i * 20}px` }}
          className="!h-3 !w-3 !border-2 !border-card !bg-primary"
        />
      ))}
    </div>
  )
}
