import type { NodeDefinition, PipelineType, NodeCategory } from '@ai-ide/types'

class NodeRegistry {
  private nodes = new Map<string, NodeDefinition>()

  register(def: NodeDefinition): void {
    if (this.nodes.has(def.id)) {
      console.warn(`[NodeRegistry] Overwriting node definition: ${def.id}`)
    }
    this.nodes.set(def.id, def)
  }

  registerAll(defs: NodeDefinition[]): void {
    defs.forEach((d) => this.register(d))
  }

  get(id: string): NodeDefinition | undefined {
    return this.nodes.get(id)
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.nodes.values())
  }

  getByPipeline(pipeline: PipelineType): NodeDefinition[] {
    return this.getAll().filter((d) => d.pipeline === pipeline)
  }

  getByCategory(category: NodeCategory): NodeDefinition[] {
    return this.getAll().filter((d) => d.category === category)
  }

  toMap(): Map<string, NodeDefinition> {
    return new Map(this.nodes)
  }

  search(query: string): NodeDefinition[] {
    const q = query.toLowerCase()
    return this.getAll().filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
    )
  }
}

export const nodeRegistry = new NodeRegistry()
