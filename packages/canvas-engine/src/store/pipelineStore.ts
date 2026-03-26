import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import { v4 as uuid } from 'uuid'
import type { PipelineDAG, PipelineNode, PipelineEdge, PipelineType } from '@ai-ide/types'

export type CanvasNode = PipelineNode & {
  type: string
  data: PipelineNode
}

export type CanvasEdge = PipelineEdge

interface PipelineState {
  dag: PipelineDAG
  selectedNodeId: string | null

  // React Flow handlers
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect

  // Actions
  addNode: (definitionId: string, position: { x: number; y: number }) => void
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void
  removeNode: (nodeId: string) => void
  selectNode: (nodeId: string | null) => void
  setDag: (dag: PipelineDAG) => void
  resetPipeline: (type: PipelineType) => void
}

const emptyDag = (type: PipelineType): PipelineDAG => ({
  id: uuid(),
  name: 'Untitled Pipeline',
  pipeline: type,
  nodes: [],
  edges: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const usePipelineStore = create<PipelineState>()(
  immer((set) => ({
    dag: emptyDag('ml'),
    selectedNodeId: null,

    onNodesChange: (changes: NodeChange[]) =>
      set((state) => {
        // Apply position/selection changes while keeping our extended data
        const rfNodes = state.dag.nodes.map((n) => ({
          id: n.id,
          type: 'pipelineNode',
          position: n.position,
          data: n,
        }))
        const updated = applyNodeChanges(changes, rfNodes)
        state.dag.nodes = updated.map((n) => ({
          ...(n.data as unknown as PipelineNode),
          position: n.position,
        }))
        state.dag.updatedAt = new Date().toISOString()
      }),

    onEdgesChange: (changes: EdgeChange[]) =>
      set((state) => {
        const rfEdges = state.dag.edges as unknown as Parameters<typeof applyEdgeChanges>[1]
        state.dag.edges = applyEdgeChanges(changes, rfEdges) as unknown as PipelineEdge[]
        state.dag.updatedAt = new Date().toISOString()
      }),

    onConnect: (connection: Connection) =>
      set((state) => {
        const rfEdges = state.dag.edges as unknown as Parameters<typeof addEdge>[1]
        state.dag.edges = addEdge({ ...connection, id: uuid() }, rfEdges) as unknown as PipelineEdge[]
        state.dag.updatedAt = new Date().toISOString()
      }),

    addNode: (definitionId, position) =>
      set((state) => {
        const node: PipelineNode = {
          id: uuid(),
          definitionId,
          position,
          config: {},
          status: 'idle',
        }
        state.dag.nodes.push(node)
        state.dag.updatedAt = new Date().toISOString()
      }),

    updateNodeConfig: (nodeId, config) =>
      set((state) => {
        const node = state.dag.nodes.find((n) => n.id === nodeId)
        if (node) {
          node.config = config
          state.dag.updatedAt = new Date().toISOString()
        }
      }),

    removeNode: (nodeId) =>
      set((state) => {
        state.dag.nodes = state.dag.nodes.filter((n) => n.id !== nodeId)
        state.dag.edges = state.dag.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        )
        if (state.selectedNodeId === nodeId) state.selectedNodeId = null
        state.dag.updatedAt = new Date().toISOString()
      }),

    selectNode: (nodeId) =>
      set((state) => {
        state.selectedNodeId = nodeId
      }),

    setDag: (dag) =>
      set((state) => {
        state.dag = dag
        state.selectedNodeId = null
      }),

    resetPipeline: (type) =>
      set((state) => {
        state.dag = emptyDag(type)
        state.selectedNodeId = null
      }),
  }))
)
