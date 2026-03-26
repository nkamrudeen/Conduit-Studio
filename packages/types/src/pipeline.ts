import type { PipelineType } from './node'

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
