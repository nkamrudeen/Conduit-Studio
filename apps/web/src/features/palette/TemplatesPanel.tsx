import React, { useState } from 'react'
import { Brain, FlaskConical, Tag, Zap, Layers, Star, BookmarkPlus, X, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { ScrollArea } from '@ai-ide/ui'
import { ML_TEMPLATES, LLM_TEMPLATES, type TemplateEntry } from '../../data/templates'
import { useUserTemplateStore } from '../../store/userTemplateStore'
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
    const xOffset =
      dag.nodes.length > 0
        ? Math.max(...dag.nodes.map((n) => n.position.x)) + 260
        : 60
    const yBase =
      dag.nodes.length > 0
        ? Math.round(dag.nodes.reduce((sum, n) => sum + n.position.y, 0) / dag.nodes.length)
        : 200

    const templateYValues = entry.dag.nodes.map((n) => n.position.y)
    const templateYMid = templateYValues.reduce((a, b) => a + b, 0) / templateYValues.length

    const idMap = new Map<string, string>()
    for (const tNode of entry.dag.nodes) {
      const newId = addNode(
        tNode.definitionId,
        {
          x: xOffset + tNode.position.x - entry.dag.nodes[0].position.x,
          y: yBase + (tNode.position.y - templateYMid),
        },
        tNode.config,
      )
      idMap.set(tNode.id, newId)
    }

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
// Save-as-template form
// ---------------------------------------------------------------------------
const EMOJI_OPTIONS = ['🌲','🚀','🔥','🔗','🦙','🏠','🤖','🧠','⚡','📊','🎯','🛠️','🌐','📑','🔮']

function SaveTemplateForm({ onClose }: { onClose: () => void }) {
  const { dag } = usePipelineStore()
  const { save } = useUserTemplateStore()

  const [name, setName] = useState(dag.name)
  const [description, setDescription] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [complexity, setComplexity] = useState<'Simple' | 'Intermediate' | 'Advanced'>('Simple')
  const [icon, setIcon] = useState('🎯')
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim()) { setError('Name is required.'); return }
    if (dag.nodes.length === 0) { setError('Canvas is empty — add some nodes first.'); return }

    save({
      dag: {
        ...dag,
        id: `user-tpl-${crypto.randomUUID()}`,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      description: description.trim() || name.trim(),
      tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
      complexity,
      icon,
    })
    onClose()
  }

  return (
    <div className="border-b border-border bg-muted/40 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">Save current pipeline as template</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>
      </div>

      <div className="mb-2">
        <p className="mb-1 text-[10px] text-muted-foreground">Icon</p>
        <div className="flex flex-wrap gap-1">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              className={[
                'rounded px-1 py-0.5 text-sm leading-none',
                icon === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent',
              ].join(' ')}
            >{e}</button>
          ))}
        </div>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name"
        className="mb-1.5 w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        rows={2}
        className="mb-1.5 w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <input
        value={tagsRaw}
        onChange={(e) => setTagsRaw(e.target.value)}
        placeholder="Tags (comma-separated)"
        className="mb-1.5 w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="mb-2.5 flex gap-1">
        {(['Simple', 'Intermediate', 'Advanced'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setComplexity(c)}
            className={[
              'flex-1 rounded py-1 text-[10px] font-medium',
              complexity === c
                ? `${COMPLEXITY_COLOR[c]} ring-1 ring-current`
                : 'bg-muted text-muted-foreground hover:bg-accent',
            ].join(' ')}
          >{c}</button>
        ))}
      </div>

      {error && <p className="mb-1.5 text-[10px] text-destructive">{error}</p>}

      <button
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-1.5 rounded bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
      >
        <BookmarkPlus size={11} />
        Save Template
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
export function TemplatesPanel({ pipeline }: TemplatesPanelProps) {
  const builtins = pipeline === 'ml' ? ML_TEMPLATES : LLM_TEMPLATES
  const { templates: userTemplates, remove } = useUserTemplateStore()
  const userForPipeline = userTemplates.filter((t) => t.dag.pipeline === pipeline)
  const insertTemplate = useInsertTemplate()
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      remove(id)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm((cur) => cur === id ? null : cur), 3000)
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Save-as-template trigger */}
      {!showSaveForm && (
        <button
          onClick={() => setShowSaveForm(true)}
          className="mx-2 mt-2 flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-primary/80 px-2 py-2 text-[11px] font-semibold text-primary-foreground shadow-sm ring-1 ring-primary/40 hover:from-primary/90 hover:to-primary/70 active:scale-[0.98] transition-all"
        >
          <BookmarkPlus size={12} />
          Save Pipeline as Template
          <Sparkles size={10} className="opacity-70" />
        </button>
      )}

      {showSaveForm && <SaveTemplateForm onClose={() => setShowSaveForm(false)} />}

      <ScrollArea className="flex-1">
        <p className="px-3 pt-2 text-[10px] text-muted-foreground leading-relaxed">
          <strong>Insert</strong> adds nodes into your current canvas without replacing it.
        </p>

        {/* User templates */}
        {userForPipeline.length > 0 && (
          <div className="px-2 pt-2">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your Templates</p>
            <div className="flex flex-col gap-2">
              {userForPipeline.map((entry) => (
                <TemplateCard
                  key={entry.id}
                  entry={entry}
                  onInsert={insertTemplate}
                  onDelete={() => handleDelete(entry.id)}
                  deleteConfirm={deleteConfirm === entry.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Built-in templates */}
        <div className="px-2 pt-3">
          {userForPipeline.length > 0 && (
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Built-in</p>
          )}
          <div className="flex flex-col gap-2 pb-4">
            {builtins.map((entry) => (
              <TemplateCard key={entry.dag.id} entry={entry} onInsert={insertTemplate} />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
function TemplateCard({
  entry,
  onInsert,
  onDelete,
  deleteConfirm,
}: {
  entry: TemplateEntry
  onInsert: (e: TemplateEntry) => void
  onDelete?: () => void
  deleteConfirm?: boolean
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
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm transition-shadow hover:shadow-md">
      {/* Card header */}
      <div className="flex items-start gap-2 p-2.5">
        <span className="mt-0.5 shrink-0 text-lg leading-none">{entry.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold text-foreground">{entry.dag.name}</span>
            <span className={['flex shrink-0 items-center gap-0.5 rounded px-1 py-0 text-[9px] font-medium', COMPLEXITY_COLOR[entry.complexity]].join(' ')}>
              {COMPLEXITY_ICON[entry.complexity]}
              {entry.complexity}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{entry.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onDelete && (
            <button
              onClick={onDelete}
              title={deleteConfirm ? 'Click again to confirm delete' : 'Delete template'}
              className={[
                'flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all',
                deleteConfirm
                  ? 'bg-destructive text-white animate-pulse'
                  : 'text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive',
              ].join(' ')}
            >
              <Trash2 size={11} />
              {deleteConfirm && <span>Sure?</span>}
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={expanded ? 'Collapse' : 'Show details'}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable detail: node chips + tags */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-2.5 py-2">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {entry.dag.nodes.map((n) => (
              <span key={n.id} className="rounded bg-background px-1 py-0 text-[9px] font-mono text-muted-foreground border border-border">
                {n.definitionId.split('.').slice(1).join('.')}
              </span>
            ))}
          </div>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {entry.tags.map((t) => (
                <span key={t} className="flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0 text-[9px] text-accent-foreground">
                  <Tag size={7} />{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insert CTA — always visible */}
      <button
        onClick={handleInsert}
        className={[
          'flex w-full items-center justify-center gap-2 px-3 py-2 text-[11px] font-semibold transition-all',
          inserted
            ? 'bg-green-600 text-white'
            : 'bg-gradient-to-r from-primary/90 via-primary to-primary/80 text-primary-foreground hover:from-primary hover:via-primary/90 hover:to-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] active:scale-[0.99]',
        ].join(' ')}
      >
        {inserted ? (
          <>✓ Inserted into canvas</>
        ) : (
          <>
            {isLlm ? <Brain size={12} /> : <FlaskConical size={12} />}
            Insert into Canvas
            <span className="ml-auto opacity-60 text-[10px]">{entry.dag.nodes.length} nodes</span>
          </>
        )}
      </button>
    </div>
  )
}
