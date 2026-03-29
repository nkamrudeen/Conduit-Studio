import type { PipelineDAG, PipelineNode, PipelineEdge, NodeDefinition, PortType } from '@ai-ide/types'

// ── Port type colours — used by handles and the validate panel ───────────────
export const PORT_TYPE_COLORS: Record<PortType, string> = {
  DataFrame:  '#3b82f6',  // blue
  Model:      '#a855f7',  // purple
  Embeddings: '#f59e0b',  // amber
  VectorStore:'#14b8a6',  // teal
  Text:       '#22c55e',  // green
  Metrics:    '#f97316',  // orange
  Any:        '#64748b',  // slate
}

// ── Port compatibility ───────────────────────────────────────────────────────
/** Returns true when sourceType can feed into targetType.
 *  'Any' is a wildcard and is compatible with every other type. */
export function portsCompatible(sourceType: PortType, targetType: PortType): boolean {
  if (sourceType === 'Any' || targetType === 'Any') return true
  return sourceType === targetType
}

// ── Pipeline-level type validation ──────────────────────────────────────────
export interface PortTypeError {
  edgeId: string
  sourceNodeLabel: string
  targetNodeLabel: string
  sourcePortLabel: string
  targetPortLabel: string
  sourceType: PortType
  targetType: PortType
  message: string
}

/** Checks every edge in the DAG for port-type compatibility.
 *  Returns one PortTypeError per incompatible connection. */
export function validatePortTypes(
  dag: PipelineDAG,
  definitionMap: Map<string, NodeDefinition>,
): PortTypeError[] {
  const errors: PortTypeError[] = []
  const nodeById = new Map(dag.nodes.map((n) => [n.id, n]))

  for (const edge of dag.edges) {
    const srcNode = nodeById.get(edge.source)
    const tgtNode = nodeById.get(edge.target)
    if (!srcNode || !tgtNode) continue

    const srcDef = definitionMap.get(srcNode.definitionId)
    const tgtDef = definitionMap.get(tgtNode.definitionId)
    if (!srcDef || !tgtDef) continue

    const srcPort = srcDef.outputs.find((p) => p.id === edge.sourceHandle)
    const tgtPort = tgtDef.inputs.find((p) => p.id === edge.targetHandle)
    if (!srcPort || !tgtPort) continue

    if (!portsCompatible(srcPort.type, tgtPort.type)) {
      errors.push({
        edgeId: edge.id,
        sourceNodeLabel: srcDef.label,
        targetNodeLabel: tgtDef.label,
        sourcePortLabel: srcPort.label,
        targetPortLabel: tgtPort.label,
        sourceType: srcPort.type,
        targetType: tgtPort.type,
        message: `${srcDef.label} → ${tgtDef.label}: output "${srcPort.label}" (${srcPort.type}) cannot connect to input "${tgtPort.label}" (${tgtPort.type})`,
      })
    }
  }
  return errors
}

/** Kahn's algorithm topological sort. Returns ordered node IDs or throws on cycle. */
export function topologicalSort(dag: PipelineDAG): PipelineNode[] {
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  for (const node of dag.nodes) {
    inDegree.set(node.id, 0)
    adjList.set(node.id, [])
  }

  for (const edge of dag.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
    adjList.get(edge.source)?.push(edge.target)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(id)
    for (const neighbor of adjList.get(id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, deg)
      if (deg === 0) queue.push(neighbor)
    }
  }

  if (sorted.length !== dag.nodes.length) {
    throw new Error('Pipeline contains a cycle — DAGs must be acyclic.')
  }

  const nodeMap = new Map(dag.nodes.map((n) => [n.id, n]))
  return sorted.map((id) => nodeMap.get(id)!)
}

export function detectCycle(nodes: PipelineNode[], edges: PipelineEdge[]): boolean {
  try {
    topologicalSort({ id: '', name: '', pipeline: 'ml', nodes, edges, createdAt: '', updatedAt: '' })
    return false
  } catch {
    return true
  }
}

/** Returns the set of node IDs reachable from startId */
export function reachableFrom(startId: string, edges: PipelineEdge[]): Set<string> {
  const visited = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target))
  }
  visited.delete(startId)
  return visited
}
