import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { nodeRegistry } from '@ai-ide/node-registry'
import { Input, ScrollArea, Badge } from '@ai-ide/ui'
import type { NodeDefinition, PipelineType, NodeCategory } from '@ai-ide/types'

const CATEGORY_ORDER: NodeCategory[] = [
  'ingest', 'extract', 'transform', 'filter', 'split',
  'chunk', 'embed', 'vectorstore',
  'train', 'llm', 'chain',
  'evaluate', 'deploy', 'monitor', 'experiment',
  'finetune',
]

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  ingest: 'Data Ingestion',
  extract: 'Extraction',
  transform: 'Transform',
  filter: 'Filter',
  split: 'Split',
  chunk: 'Chunking',
  embed: 'Embedding',
  vectorstore: 'Vector Store',
  train: 'Training',
  llm: 'LLM Model',
  chain: 'Chain / Agent',
  evaluate: 'Evaluation',
  deploy: 'Deploy',
  monitor: 'Monitoring',
  experiment: 'MLflow Experiments',
  finetune: 'Fine-Tuning (LoRA/QLoRA)',
}

interface NodePaletteProps {
  pipeline: PipelineType
}

export function NodePalette({ pipeline }: NodePaletteProps) {
  const [query, setQuery] = useState('')

  const nodes = useMemo(() => {
    const base = query
      ? nodeRegistry.search(query).filter((n) => n.pipeline === pipeline)
      : nodeRegistry.getByPipeline(pipeline)
    return base
  }, [pipeline, query])

  const grouped = useMemo(() => {
    const map = new Map<NodeCategory, NodeDefinition[]>()
    for (const node of nodes) {
      const arr = map.get(node.category) ?? []
      arr.push(node)
      map.set(node.category, arr)
    }
    return map
  }, [nodes])

  return (
    <aside data-testid="node-palette" className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="p-2">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder="Search nodes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => (
            <div key={cat} className="mb-3">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="flex flex-col gap-1">
                {grouped.get(cat)!.map((node) => (
                  <NodeCard key={node.id} node={node} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}

function NodeCard({ node }: { node: NodeDefinition }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/ai-ide-node', node.id)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs transition-colors hover:border-primary hover:bg-accent active:cursor-grabbing"
      title={node.description}
    >
      <span className="text-base leading-none">{node.icon}</span>
      <span className="truncate font-medium">{node.label}</span>
    </div>
  )
}
