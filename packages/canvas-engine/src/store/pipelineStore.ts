import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuid } from 'uuid'
import type { PipelineDAG, PipelineNode, PipelineEdge, PipelineType, NodeResult } from '@ai-ide/types'
import { PROPAGATABLE_FIELDS, reachableFrom } from '../utils/dagUtils'

interface PipelineState {
  dag: PipelineDAG
  selectedNodeId: string | null

  // Actions
  addNode: (definitionId: string, position: { x: number; y: number }, initialConfig?: Record<string, unknown>) => string
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void
  updateNodeStatus: (nodeId: string, status: 'idle' | 'running' | 'success' | 'error') => void
  updateNodeResult: (nodeId: string, result: NodeResult) => void
  removeNode: (nodeId: string) => void
  removeEdge: (edgeId: string) => void
  addEdge: (edge: PipelineEdge) => void
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

    addNode: (definitionId, position, initialConfig) => {
      const id = uuid()
      set((state) => {
        const node: PipelineNode = {
          id,
          definitionId,
          position,
          config: initialConfig ?? {},
          status: 'idle',
        }
        state.dag.nodes.push(node)
        state.selectedNodeId = id
        state.dag.updatedAt = new Date().toISOString()
      })
      return id
    },

    updateNodeConfig: (nodeId, config) =>
      set((state) => {
        const node = state.dag.nodes.find((n) => n.id === nodeId)
        if (!node) return

        // Collect propagatable fields whose value actually changed.
        const toPropagate: Record<string, unknown> = {}
        for (const key of PROPAGATABLE_FIELDS) {
          if (key in config && config[key] !== node.config[key]) {
            toPropagate[key] = config[key]
          }
        }

        node.config = config
        state.dag.updatedAt = new Date().toISOString()

        if (Object.keys(toPropagate).length === 0) return

        // Walk every node reachable downstream and sync the changed fields.
        // Only update a key if the downstream node already has that key set —
        // this avoids injecting irrelevant fields into unrelated node types.
        const downstream = reachableFrom(nodeId, state.dag.edges)
        for (const downId of downstream) {
          const dn = state.dag.nodes.find((n) => n.id === downId)
          if (!dn) continue
          for (const [key, val] of Object.entries(toPropagate)) {
            if (key in dn.config) {
              dn.config = { ...dn.config, [key]: val }
            }
          }
        }
      }),

    updateNodePosition: (nodeId, position) =>
      set((state) => {
        const node = state.dag.nodes.find((n) => n.id === nodeId)
        if (node) {
          node.position = position
          state.dag.updatedAt = new Date().toISOString()
        }
      }),

    updateNodeStatus: (nodeId, status) =>
      set((state) => {
        const node = state.dag.nodes.find((n) => n.id === nodeId)
        if (node) node.status = status
      }),

    updateNodeResult: (nodeId, result) =>
      set((state) => {
        const node = state.dag.nodes.find((n) => n.id === nodeId)
        if (node) node.result = result
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

    removeEdge: (edgeId) =>
      set((state) => {
        state.dag.edges = state.dag.edges.filter((e) => e.id !== edgeId)
        state.dag.updatedAt = new Date().toISOString()
      }),

    addEdge: (edge) =>
      set((state) => {
        state.dag.edges.push(edge)
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
