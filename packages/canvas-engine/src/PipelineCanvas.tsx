import React, { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePipelineStore } from './store/pipelineStore'
import { BaseNode } from './nodes/BaseNode'
import type { NodeDefinition } from '@ai-ide/types'

const nodeTypes = { pipelineNode: BaseNode }

interface PipelineCanvasProps {
  /** Registry of all known node definitions — used to enrich node data */
  definitionMap: Map<string, NodeDefinition>
  onNodeSelect?: (nodeId: string | null) => void
}

export function PipelineCanvas({ definitionMap, onNodeSelect }: PipelineCanvasProps) {
  const { dag, onNodesChange, onEdgesChange, onConnect, selectNode, addNode } = usePipelineStore()

  const rfNodes: Node[] = useMemo(
    () =>
      dag.nodes.map((n) => ({
        id: n.id,
        type: 'pipelineNode',
        position: n.position,
        data: { ...n, definition: definitionMap.get(n.definitionId) },
        selected: false,
      })),
    [dag.nodes, definitionMap]
  )

  const rfEdges: Edge[] = useMemo(
    () =>
      dag.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      })),
    [dag.edges]
  )

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id)
      onNodeSelect?.(node.id)
    },
    [selectNode, onNodeSelect]
  )

  const handlePaneClick = useCallback(() => {
    selectNode(null)
    onNodeSelect?.(null)
  }, [selectNode, onNodeSelect])

  // Accept drops from the node palette
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const definitionId = event.dataTransfer.getData('application/ai-ide-node')
      if (!definitionId) return

      const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
      addNode(definitionId, {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 30,
      })
    },
    [addNode]
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const def = definitionMap.get((n.data as { definitionId: string }).definitionId ?? '')
            return def?.color ?? '#6366f1'
          }}
          maskColor="rgba(15,23,42,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
