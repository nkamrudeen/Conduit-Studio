import type { PipelineDAG, PipelineNode, PipelineEdge } from '@ai-ide/types'

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
