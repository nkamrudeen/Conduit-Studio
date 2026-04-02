import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, FlaskConical, Tag, ArrowRight, Zap, Layers, Star } from 'lucide-react'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { ScrollArea } from '@ai-ide/ui'
import { ML_TEMPLATES, LLM_TEMPLATES, type TemplateEntry } from '../../data/templates'
import type { PipelineType } from '@ai-ide/types'

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

export function TemplatesPanel({ pipeline }: TemplatesPanelProps) {
  const templates = pipeline === 'ml' ? ML_TEMPLATES : LLM_TEMPLATES
  const { setDag } = usePipelineStore()
  const navigate = useNavigate()

  const openTemplate = (entry: TemplateEntry) => {
    // Re-stamp IDs and timestamps so it behaves like a fresh pipeline
    const { v4: uuid } = require('uuid') as typeof import('uuid')
    const dag = {
      ...entry.dag,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setDag(dag)
    navigate(`/pipeline/${entry.dag.pipeline}`)
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-3 px-2 pb-4 pt-2">
        {templates.map((entry) => (
          <TemplateCard key={entry.dag.id} entry={entry} onOpen={openTemplate} />
        ))}
      </div>
    </ScrollArea>
  )
}

function TemplateCard({
  entry,
  onOpen,
}: {
  entry: TemplateEntry
  onOpen: (e: TemplateEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLlm = entry.dag.pipeline === 'llm'

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

      {/* Expanded: node list + tags + open button */}
      {expanded && (
        <div className="border-t border-border px-2.5 pb-2.5 pt-2">
          {/* Mini pipeline preview */}
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
            onClick={() => onOpen(entry)}
            className="flex w-full items-center justify-center gap-1.5 rounded bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
          >
            {isLlm ? <Brain size={11} /> : <FlaskConical size={11} />}
            Use Template
            <ArrowRight size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
