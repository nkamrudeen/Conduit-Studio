import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge as rfAddEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type FinalConnectionState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePipelineStore } from './store/pipelineStore'
import { BaseNode } from './nodes/BaseNode'
import type { NodeDefinition, PipelineEdge, PortType } from '@ai-ide/types'
import { v4 as uuid } from 'uuid'
import { portsCompatible } from './utils/dagUtils'

const nodeTypes = { pipelineNode: BaseNode }

interface PipelineCanvasProps {
  definitionMap: Map<string, NodeDefinition>
  onNodeSelect?: (nodeId: string | null) => void
}

// Inner component has access to useReactFlow (must be inside ReactFlowProvider)
function CanvasContent({ definitionMap, onNodeSelect }: PipelineCanvasProps) {
  // Connection error shown as a floating banner when a type-incompatible drop occurs
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const connectionErrorRef = useRef<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    dag,
    selectNode,
    addNode,
    updateNodePosition,
    removeNode,
    removeEdge,
    addEdge: storeAddEdge,
  } = usePipelineStore()

  const { screenToFlowPosition, fitView } = useReactFlow()

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Sync Zustand dag → RF nodes, preserving RF internals (measured, etc.)
  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return dag.nodes.map((dn) => ({
        ...(prevById.get(dn.id) ?? {}),
        id: dn.id,
        type: 'pipelineNode' as const,
        position: dn.position,
        selected: false,
        data: { ...dn, definition: definitionMap.get(dn.definitionId) },
      }))
    })
  }, [dag.nodes, definitionMap])

  // Sync Zustand dag → RF edges
  useEffect(() => {
    setRfEdges((prev) => {
      const prevById = new Map(prev.map((e) => [e.id, e]))
      return dag.edges.map((de) => ({
        ...(prevById.get(de.id) ?? {}),
        id: de.id,
        source: de.source,
        sourceHandle: de.sourceHandle ?? null,
        target: de.target,
        targetHandle: de.targetHandle ?? null,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
      }))
    })
  }, [dag.edges])

  // fitView when dag changes (e.g. sample loaded)
  useEffect(() => {
    if (dag.nodes.length > 0) {
      // Small delay lets RF measure nodes first
      const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 80)
      return () => clearTimeout(t)
    }
  }, [dag.id]) // only re-fit when the entire pipeline is replaced (id changes)

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
      for (const change of changes) {
        if (change.type === 'position' && !change.dragging && change.position) {
          updateNodePosition(change.id, change.position)
        }
        if (change.type === 'remove') {
          removeNode(change.id)
        }
      }
    },
    [onNodesChange, updateNodePosition, removeNode]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)
      for (const change of changes) {
        if (change.type === 'remove') {
          removeEdge(change.id)
        }
      }
    },
    [onEdgesChange, removeEdge]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const edge: PipelineEdge = {
        id: uuid(),
        source: connection.source!,
        sourceHandle: connection.sourceHandle ?? '',
        target: connection.target!,
        targetHandle: connection.targetHandle ?? '',
      }
      setRfEdges((eds) =>
        rfAddEdge(
          {
            ...connection,
            id: edge.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds
        )
      )
      storeAddEdge(edge)
    },
    [setRfEdges, storeAddEdge]
  )

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const { source, sourceHandle, target, targetHandle } = connection
      if (!source || !sourceHandle || !target || !targetHandle) return true

      const srcNode = dag.nodes.find((n) => n.id === source)
      const tgtNode = dag.nodes.find((n) => n.id === target)
      if (!srcNode || !tgtNode) return true

      const srcDef = definitionMap.get(srcNode.definitionId)
      const tgtDef = definitionMap.get(tgtNode.definitionId)
      if (!srcDef || !tgtDef) return true

      const srcPort = srcDef.outputs.find((p) => p.id === sourceHandle)
      const tgtPort = tgtDef.inputs.find((p) => p.id === targetHandle)
      if (!srcPort || !tgtPort) return true

      if (!portsCompatible(srcPort.type as PortType, tgtPort.type as PortType)) {
        connectionErrorRef.current =
          `Type mismatch: "${srcPort.label}" outputs ${srcPort.type} but "${tgtPort.label}" expects ${tgtPort.type}`
        return false
      }
      connectionErrorRef.current = null
      return true
    },
    [dag.nodes, definitionMap],
  )

  const handleConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      // state.isValid === false means the user released on a handle that was blocked
      // state.toNode !== null means they actually aimed at a node (not empty canvas)
      if (state.isValid === false && state.toNode !== null && connectionErrorRef.current) {
        const msg = connectionErrorRef.current
        connectionErrorRef.current = null
        setConnectionError(msg)
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
        errorTimerRef.current = setTimeout(() => setConnectionError(null), 3500)
      } else {
        connectionErrorRef.current = null
      }
    },
    [],
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

  // Drop from palette — use screenToFlowPosition for correct pan/zoom coords
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const definitionId = event.dataTransfer.getData('application/ai-ide-node')
      if (!definitionId) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(definitionId, position)
      // node is auto-selected inside addNode; notify parent
      onNodeSelect?.(definitionId)
    },
    [addNode, screenToFlowPosition, onNodeSelect]
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0 }} onDrop={onDrop} onDragOver={onDragOver}>
      {/* Connection type-mismatch error toast */}
      {connectionError && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: '#7f1d1d',
            border: '1px solid #ef4444',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 11,
            color: '#fca5a5',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ✕ {connectionError}
        </div>
      )}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
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

// Public export wraps with ReactFlowProvider so useReactFlow works inside
export function PipelineCanvas(props: PipelineCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  )
}
