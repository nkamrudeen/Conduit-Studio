import React, { useState } from 'react'
import { Brain, FlaskConical, Tag, ArrowRight, Zap, Layers, Star, PlusSquare } from 'lucide-react'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { ScrollArea } from '@ai-ide/ui'
import { ML_TEMPLATES, LLM_TEMPLATES, type TemplateEntry } from '../../data/templates'
import type { PipelineType, PipelineEdge } from '@ai-ide/types'

interface TemplatesPanelProps {
  pipeline: PipelineType
}

const COMPLEXITY_COLOR: Record<string, string> = {
  Simple: 'text-green-500 bg-green-500/10',
  Intermediate: 'text-yellow-500 bg-yellow-500/10',
  Advanced: 'text-red-400 bg-red-400/10',
}

const COMPLEXITY_ICON: Record<string, React.ReactNode> = {
  Simple: <Zap size={9} />,
  Intermediate: <Layers size={9} />,
  Advanced: <Star size={9} />,
}

// ---------------------------------------------------------------------------
// Insert template nodes additively into the current canvas
// ---------------------------------------------------------------------------
function useInsertTemplate() {
  const { dag, addNode, addEdge } = usePipelineStore()

  return (entry: TemplateEntry) => {
    // Find the rightmost X in the existing canvas so we don't overlap
    const xOffset =
      dag.nodes.length > 0
        ? Math.max(...dag.nodes.map((n) => n.position.x)) + 260
        : 60

    // Find the vertical midpoint of existing nodes (or 200 if canvas is empty)
    const yBase =
      dag.nodes.length > 0
        ? Math.round(
            dag.nodes.reduce((sum, n) => sum + n.position.y, 0) / dag.nodes.length
          )
        : 200

    // Normalise template node Y positions relative to their own midpoint so
    // the inserted sub-graph is centred at yBase
    const templateYValues = entry.dag.nodes.map((n) => n.position.y)
    const templateYMid =
      templateYValues.reduce((a, b) => a + b, 0) / templateYValues.length

    // Map old template node IDs → new store IDs returned by addNode
    const idMap = new Map<string, string>()

    for (const tNode of entry.dag.nodes) {
      const newId = addNode(tNode.definitionId, {
        x: xOffset + tNode.position.x - entry.dag.nodes[0].position.x,
        y: yBase + (tNode.position.y - templateYMid),
      }, tNode.config)
      idMap.set(tNode.id, newId)
    }

    // Remap edges to new IDs
    for (const tEdge of entry.dag.edges) {
      const newSource = idMap.get(tEdge.source)
      const newTarget = idMap.get(tEdge.target)
      if (!newSource || !newTarget) continue
      const edge: PipelineEdge = {
        id: crypto.randomUUID(),
        source: newSource,
        sourceHandle: tEdge.sourceHandle,
        target: newTarget,
        targetHandle: tEdge.targetHandle,
      }
      addEdge(edge)
    }
  }
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export function TemplatesPanel({ pipeline }: TemplatesPanelProps) {
  const templates = pipeline === 'ml' ? ML_TEMPLATES : LLM_TEMPLATES
  const insertTemplate = useInsertTemplate()

  return (
    <ScrollArea className="flex-1">
      <p className="px-3 pt-2 text-[10px] text-muted-foreground leading-relaxed">
        Click <strong>Insert</strong> to add a template's nodes into the current canvas without replacing it.
      </p>
      <div className="flex flex-col gap-3 px-2 pb-4 pt-2">
        {templates.map((entry) => (
          <TemplateCard key={entry.dag.id} entry={entry} onInsert={insertTemplate} />
        ))}
      </div>
    </ScrollArea>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
function TemplateCard({
  entry,
  onInsert,
}: {
  entry: TemplateEntry
  onInsert: (e: TemplateEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [inserted, setInserted] = useState(false)
  const isLlm = entry.dag.pipeline === 'llm'

  const handleInsert = () => {
    onInsert(entry)
    setInserted(true)
    setTimeout(() => setInserted(false), 2000)
  }

  return (
    <div className="rounded-md border border-border bg-background shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 p-2.5 text-left"
      >
        <span className="mt-0.5 shrink-0 text-base leading-none">{entry.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">{entry.dag.name}</span>
            <span
              className={[
                'flex shrink-0 items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium',
                COMPLEXITY_COLOR[entry.complexity],
              ].join(' ')}
            >
              {COMPLEXITY_ICON[entry.complexity]}
              {entry.complexity}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
        </div>
      </button>

      {/* Expanded: node chips + tags + insert button */}
      {expanded && (
        <div className="border-t border-border px-2.5 pb-2.5 pt-2">
          {/* Mini node list */}
          <div className="mb-2 flex flex-wrap gap-1">
            {entry.dag.nodes.map((n) => {
              const short = n.definitionId.split('.').slice(1).join('.')
              return (
                <span key={n.id} className="rounded bg-muted px-1 py-0 text-[9px] font-mono text-muted-foreground">
                  {short}
                </span>
              )
            })}
          </div>

          {/* Tags */}
          <div className="mb-2.5 flex flex-wrap gap-1">
            {entry.tags.map((t) => (
              <span key={t} className="flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0 text-[9px] text-accent-foreground">
                <Tag size={7} />
                {t}
              </span>
            ))}
          </div>

          <button
            onClick={handleInsert}
            className={[
              'flex w-full items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium transition-colors',
              inserted
                ? 'bg-green-600 text-white'
                : 'bg-primary text-primary-foreground hover:opacity-90',
            ].join(' ')}
          >
            {inserted ? (
              '✓ Inserted'
            ) : (
              <>
                {isLlm ? <Brain size={11} /> : <FlaskConical size={11} />}
                <PlusSquare size={11} />
                Insert into canvas
                <ArrowRight size={11} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
