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
import { portsCompatible, PORT_TYPE_COLORS } from './utils/dagUtils'

const nodeTypes = { pipelineNode: BaseNode }

interface PipelineCanvasProps {
  definitionMap: Map<string, NodeDefinition>
  onNodeSelect?: (nodeId: string | null) => void
  /** Optional: called when a node is dropped; returns initial config to pre-fill */
  getNodeDefaults?: (definitionId: string) => Record<string, unknown>
}

interface ContextMenuState {
  type: 'node' | 'edge'
  id: string
  x: number
  y: number
  edgeDetail?: {
    sourceLabel: string
    sourcePort: string
    sourceType: string
    targetLabel: string
    targetPort: string
    targetType: string
  }
}

// ── Context menu overlay ─────────────────────────────────────────────────────
function ContextMenu({
  menu,
  onClose,
  onDeleteNode,
  onPropertiesNode,
  onDeleteEdge,
}: {
  menu: ContextMenuState
  onClose: () => void
  onDeleteNode: (id: string) => void
  onPropertiesNode: (id: string) => void
  onDeleteEdge: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: menu.x, y: menu.y })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setPos({
      x: menu.x + rect.width > window.innerWidth ? menu.x - rect.width : menu.x,
      y: menu.y + rect.height > window.innerHeight ? menu.y - rect.height : menu.y,
    })
  }, [menu.x, menu.y])

  const itemCls =
    'flex items-center gap-2 w-full rounded px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 transition-colors cursor-pointer'
  const dangerCls =
    'flex items-center gap-2 w-full rounded px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer'
  const sep = <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />

  return (
    <>
      {/* click-away backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onMouseDown={onClose} />
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 999,
          minWidth: 172,
          background: '#1e293b',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
          padding: 4,
          fontFamily: 'inherit',
        }}
      >
        {menu.type === 'node' && (
          <>
            <button
              className={itemCls}
              onMouseDown={(e) => { e.stopPropagation(); onPropertiesNode(menu.id); onClose() }}
            >
              <span>⚙</span> Properties
            </button>
            {sep}
            <button
              className={dangerCls}
              onMouseDown={(e) => { e.stopPropagation(); onDeleteNode(menu.id); onClose() }}
            >
              <span>🗑</span> Delete Node
            </button>
          </>
        )}

        {menu.type === 'edge' && (
          <>
            {/* Edge info */}
            <div style={{ padding: '6px 10px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Edge Properties
              </div>
              {menu.edgeDetail ? (
                <>
                  {/* Source */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#e2e8f0', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {menu.edgeDetail.sourceLabel}
                    </span>
                    <TypeBadge label={menu.edgeDetail.sourcePort} type={menu.edgeDetail.sourceType} />
                  </div>
                  {/* Arrow */}
                  <div style={{ color: '#6366f1', fontSize: 14, textAlign: 'center', lineHeight: 1.2, marginBottom: 2 }}>↓</div>
                  {/* Target */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#e2e8f0', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {menu.edgeDetail.targetLabel}
                    </span>
                    <TypeBadge label={menu.edgeDetail.targetPort} type={menu.edgeDetail.targetType} />
                  </div>
                  {/* Compatibility indicator */}
                  {menu.edgeDetail.sourceType === menu.edgeDetail.targetType || menu.edgeDetail.sourceType === 'Any' || menu.edgeDetail.targetType === 'Any' ? (
                    <div style={{ fontSize: 10, color: '#4ade80' }}>✓ Types compatible</div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#f87171' }}>✕ Type mismatch</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 11, color: '#64748b' }}>No detail available</div>
              )}
            </div>
            <div style={{ height: 4 }} />
            <button
              className={dangerCls}
              onMouseDown={(e) => { e.stopPropagation(); onDeleteEdge(menu.id); onClose() }}
            >
              <span>🗑</span> Delete Edge
            </button>
          </>
        )}
      </div>
    </>
  )
}

function TypeBadge({ label, type }: { label: string; type: string }) {
  const color = (PORT_TYPE_COLORS as Record<string, string>)[type] ?? '#64748b'
  return (
    <span
      style={{
        borderRadius: 4,
        padding: '1px 5px',
        fontSize: 10,
        fontWeight: 700,
        background: color + '28',
        color,
        border: `1px solid ${color}55`,
        whiteSpace: 'nowrap',
        maxWidth: 80,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
  )
}

// ── Inner canvas (must be inside ReactFlowProvider) ──────────────────────────
function CanvasContent({ definitionMap, onNodeSelect, getNodeDefaults }: PipelineCanvasProps) {
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const connectionErrorRef = useRef<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

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

  // Sync Zustand dag → RF nodes
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

  // fitView when a new pipeline is loaded (dag.id changes)
  useEffect(() => {
    if (dag.nodes.length > 0) {
      const t = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 80)
      return () => clearTimeout(t)
    }
  }, [dag.id])

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
          { ...connection, id: edge.id, type: 'smoothstep', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
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
    [dag.nodes, definitionMap]
  )

  const handleConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
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
    []
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
    setContextMenu(null)
  }, [selectNode, onNodeSelect])

  // ── Right-click on node ────────────────────────────────────────────────────
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      event.stopPropagation()
      setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY })
    },
    []
  )

  // ── Right-click on edge ────────────────────────────────────────────────────
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      event.stopPropagation()

      const dagEdge = dag.edges.find((e) => e.id === edge.id)
      let edgeDetail: ContextMenuState['edgeDetail'] = undefined

      if (dagEdge) {
        const srcNode = dag.nodes.find((n) => n.id === dagEdge.source)
        const tgtNode = dag.nodes.find((n) => n.id === dagEdge.target)
        const srcDef = srcNode ? definitionMap.get(srcNode.definitionId) : undefined
        const tgtDef = tgtNode ? definitionMap.get(tgtNode.definitionId) : undefined
        const srcPort = srcDef?.outputs.find((p) => p.id === dagEdge.sourceHandle)
        const tgtPort = tgtDef?.inputs.find((p) => p.id === dagEdge.targetHandle)

        edgeDetail = {
          sourceLabel: srcDef?.label ?? srcNode?.definitionId ?? 'Unknown',
          sourcePort: srcPort?.label ?? dagEdge.sourceHandle ?? '—',
          sourceType: srcPort?.type ?? 'Any',
          targetLabel: tgtDef?.label ?? tgtNode?.definitionId ?? 'Unknown',
          targetPort: tgtPort?.label ?? dagEdge.targetHandle ?? '—',
          targetType: tgtPort?.type ?? 'Any',
        }
      }

      setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY, edgeDetail })
    },
    [dag.edges, dag.nodes, definitionMap]
  )

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleContextProperties = useCallback(
    (nodeId: string) => {
      selectNode(nodeId)
      onNodeSelect?.(nodeId)
    },
    [selectNode, onNodeSelect]
  )

  const handleContextDeleteNode = useCallback(
    (nodeId: string) => { removeNode(nodeId) },
    [removeNode]
  )

  const handleContextDeleteEdge = useCallback(
    (edgeId: string) => {
      removeEdge(edgeId)
      setRfEdges((eds) => eds.filter((e) => e.id !== edgeId))
    },
    [removeEdge, setRfEdges]
  )

  // ── Drop from palette ─────────────────────────────────────────────────────
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const definitionId = event.dataTransfer.getData('application/ai-ide-node')
      if (!definitionId) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const defaults = getNodeDefaults?.(definitionId)
      addNode(definitionId, position, defaults)
      onNodeSelect?.(definitionId)
    },
    [addNode, screenToFlowPosition, onNodeSelect, getNodeDefaults]
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
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
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

      {/* Right-click context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onPropertiesNode={handleContextProperties}
          onDeleteNode={handleContextDeleteNode}
          onDeleteEdge={handleContextDeleteEdge}
        />
      )}
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
