import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, Brain, ArrowRight, Tag } from 'lucide-react'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import type { PipelineDAG } from '@ai-ide/types'
import { ML_SAMPLES, LLM_SAMPLES, type SampleEntry } from '../../data/samples'

export function SamplesPage() {
  const [activeTab, setActiveTab] = useState<'ml' | 'llm'>('ml')
  const { setDag } = usePipelineStore()
  const navigate = useNavigate()

  const samples = activeTab === 'ml' ? ML_SAMPLES : LLM_SAMPLES

  const openSample = (dag: PipelineDAG) => {
    setDag(dag)
    navigate(`/pipeline/${dag.pipeline}`)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h1 className="text-base font-semibold text-foreground">Sample Pipelines</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pre-built pipelines ready to open, inspect, and generate code from.
        </p>

        {/* Tab switcher */}
        <div className="mt-3 flex gap-1">
          <button
            onClick={() => setActiveTab('ml')}
            className={[
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'ml'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ].join(' ')}
          >
            <FlaskConical size={12} />
            ML Pipelines
          </button>
          <button
            onClick={() => setActiveTab('llm')}
            className={[
              'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'llm'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ].join(' ')}
          >
            <Brain size={12} />
            LLM Pipelines
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {samples.map((entry) => (
            <SampleCard key={entry.dag.id} entry={entry} onOpen={openSample} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SampleCard({
  entry,
  onOpen,
}: {
  entry: SampleEntry
  onOpen: (dag: PipelineDAG) => void
}) {
  const { dag, description, tags } = entry
  const isLlm = dag.pipeline === 'llm'
  const nodeCount = dag.nodes.length
  const edgeCount = dag.edges.length

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Title row */}
      <div className="flex items-start gap-2">
        <div
          className={[
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded',
            isLlm ? 'bg-violet-500/15 text-violet-500' : 'bg-blue-500/15 text-blue-500',
          ].join(' ')}
        >
          {isLlm ? <Brain size={14} /> : <FlaskConical size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{dag.name}</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {nodeCount} nodes · {edgeCount} edges
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{description}</p>

      {/* Node list */}
      <div className="mt-3 flex flex-wrap gap-1">
        {dag.nodes.map((n) => {
          const short = n.definitionId.split('.').slice(1).join('.')
          return (
            <span
              key={n.id}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {short}
            </span>
          )
        })}
      </div>

      {/* Tags */}
      <div className="mt-2 flex flex-wrap gap-1">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
          >
            <Tag size={8} />
            {t}
          </span>
        ))}
      </div>

      {/* Open button */}
      <button
        onClick={() => onOpen(dag)}
        className="mt-4 flex items-center justify-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Open in Canvas
        <ArrowRight size={11} />
      </button>
    </div>
  )
}
