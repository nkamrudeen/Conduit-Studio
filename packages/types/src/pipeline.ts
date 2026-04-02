import type { PipelineType } from './node'

/** Serialized output from a single node after execution. */
export interface NodeOutputPreview {
  type: 'DataFrame' | 'Model' | 'Metrics' | 'Text' | 'Number' | 'Unknown'
  /** Variable name in the generated script */
  name: string
  // DataFrame
  shape?: [number, number]
  columns?: string[]
  dtypes?: Record<string, string>
  rows?: Record<string, unknown>[]
  // Model
  className?: string
  // Metrics / text / number
  value?: unknown
}

export interface NodeResult {
  /** All output variables captured after this node ran */
  outputs: NodeOutputPreview[]
  /** ms the node took to run */
  durationMs?: number
}

export interface PipelineNode {
  /** Instance ID (uuid) — unique within the pipeline */
  id: string
  /** References NodeDefinition.id */
  definitionId: string
  position: { x: number; y: number }
  /** User-filled values matching the node's configSchema */
  config: Record<string, unknown>
  /** Runtime state — set by executor */
  status?: 'idle' | 'running' | 'success' | 'error'
  error?: string
  /** Output preview captured after successful execution */
  result?: NodeResult
}

export interface PipelineEdge {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

export interface PipelineDAG {
  id: string
  name: string
  pipeline: PipelineType
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  createdAt: string
  updatedAt: string
}

export interface PipelineRun {
  id: string
  pipelineId: string
  status: 'pending' | 'running' | 'success' | 'failed'
  startedAt: string
  finishedAt?: string
  logs: string[]
}
