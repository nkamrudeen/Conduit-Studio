import React, { useState, useEffect, useRef } from 'react'
import { History, X, GitCompare, RotateCcw, Loader2, Plus, Minus, AlertCircle } from 'lucide-react'
import { ScrollArea } from '@ai-ide/ui'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { useProjectStore } from '../../store/projectStore'
import { getApiBase } from '../../lib/api'
import { nodeRegistry } from '@ai-ide/node-registry'

interface Snapshot {
  id: number
  pipeline_id: string
  label: string
  created_at: string
  node_count: number
}

interface DiffResult {
  added: { id: string; definitionId: string; config: Record<string, unknown> }[]
  removed: { id: string; definitionId: string; config: Record<string, unknown> }[]
  changed: { node_id: string; definition_id: string; config_diff: Record<string, { from: unknown; to: unknown }> }[]
  error?: string
}

interface PipelineDiffViewProps {
  onClose: () => void
  onRestoreSnapshot?: (dag: unknown) => void
}

export function PipelineDiffView({ onClose, onRestoreSnapshot }: PipelineDiffViewProps) {
  const { dag, setDag } = usePipelineStore()
  const { projectFolder } = useProjectStore()
  const projectDir = projectFolder ?? '~/.conduitcraft/vault'

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedA, setSelectedA] = useState<number | null>(null)
  const [selectedB, setSelectedB] = useState<number | null>(null)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [restoring, setRestoring] = useState<number | null>(null)

  // Auto-save current snapshot every 30s
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveSnapshot = async (label = '') => {
    if (!dag.nodes.length) return
    try {
      await fetch(`${getApiBase()}/history/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_dir: projectDir, dag, label }),
      })
    } catch { /* silently ignore */ }
  }

  useEffect(() => {
    autoSaveRef.current = setInterval(() => saveSnapshot(), 30_000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [dag, projectDir])

  const fetchSnapshots = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${getApiBase()}/history/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_dir: projectDir, pipeline_id: dag.id }),
      })
      const data = await res.json()
      if (Array.isArray(data)) setSnapshots(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSnapshots() }, [dag.id, projectDir])

  const computeDiff = async () => {
    if (selectedA === null || selectedB === null) return
    setDiffLoading(true)
    setDiff(null)
    try {
      const res = await fetch(`${getApiBase()}/history/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_dir: projectDir, snapshot_a_id: selectedA, snapshot_b_id: selectedB }),
      })
      setDiff(await res.json())
    } catch { /* ignore */ } finally {
      setDiffLoading(false)
    }
  }

  const restoreSnapshot = async (snapId: number) => {
    setRestoring(snapId)
    try {
      const res = await fetch(`${getApiBase()}/history/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_dir: projectDir, snapshot_id: snapId }),
      })
      const data = await res.json()
      if (data.dag) {
        setDag(data.dag)
        onRestoreSnapshot?.(data.dag)
        onClose()
      }
    } catch { /* ignore */ } finally {
      setRestoring(null)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso + 'Z')
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex h-[80vh] w-[700px] max-w-[95vw] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <History size={14} className="text-primary" />
          <h2 className="flex-1 text-sm font-semibold">Pipeline History</h2>
          <button
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1"
            onClick={() => { saveSnapshot('manual'); fetchSnapshots() }}
          >
            Save Now
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Snapshot list */}
          <div className="flex w-56 shrink-0 flex-col border-r border-border">
            <p className="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Snapshots
            </p>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-muted-foreground">
                  <Loader2 size={10} className="animate-spin" /> Loading…
                </div>
              ) : snapshots.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground italic">No snapshots yet.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {snapshots.map((s) => {
                    const isA = selectedA === s.id
                    const isB = selectedB === s.id
                    return (
                      <div
                        key={s.id}
                        className={[
                          'group px-3 py-2 cursor-pointer hover:bg-accent/50',
                          (isA || isB) ? 'bg-accent/30' : '',
                        ].join(' ')}
                        onClick={() => {
                          if (!selectedA) setSelectedA(s.id)
                          else if (!selectedB && s.id !== selectedA) setSelectedB(s.id)
                          else { setSelectedA(s.id); setSelectedB(null); setDiff(null) }
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {isA && <span className="rounded bg-blue-500/20 px-1 text-[8px] font-bold text-blue-400">A</span>}
                          {isB && <span className="rounded bg-orange-500/20 px-1 text-[8px] font-bold text-orange-400">B</span>}
                          <span className="flex-1 truncate text-[11px] font-medium">
                            {s.label || `Auto #${s.id}`}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">{formatTime(s.created_at)}</p>
                        <p className="text-[9px] text-muted-foreground">{s.node_count} nodes</p>
                        <button
                          className="mt-1 hidden items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground group-hover:flex"
                          onClick={(e) => { e.stopPropagation(); restoreSnapshot(s.id) }}
                          disabled={restoring === s.id}
                        >
                          {restoring === s.id
                            ? <><Loader2 size={9} className="animate-spin" /> Restoring…</>
                            : <><RotateCcw size={9} /> Restore</>
                          }
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Diff panel */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Compare bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
              <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                A: {selectedA ? `#${selectedA}` : 'pick a snapshot'}
              </span>
              <span className="text-muted-foreground text-xs">vs</span>
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                B: {selectedB ? `#${selectedB}` : 'pick a snapshot'}
              </span>
              <button
                className="ml-auto flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] hover:bg-accent disabled:opacity-40"
                disabled={selectedA === null || selectedB === null || diffLoading}
                onClick={computeDiff}
              >
                {diffLoading
                  ? <><Loader2 size={10} className="animate-spin" /> Comparing…</>
                  : <><GitCompare size={10} /> Compare</>
                }
              </button>
            </div>

            <ScrollArea className="flex-1 p-3">
              {!diff && !diffLoading && (
                <p className="text-[11px] text-muted-foreground italic">
                  Select two snapshots (A and B) then click Compare.
                </p>
              )}
              {diff?.error && (
                <div className="flex items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-400">
                  <AlertCircle size={11} /> {diff.error}
                </div>
              )}
              {diff && !diff.error && (
                <div className="space-y-4">
                  {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
                    <p className="text-[11px] text-green-400">No differences — snapshots are identical.</p>
                  )}

                  {/* Added nodes */}
                  {diff.added.length > 0 && (
                    <section>
                      <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-green-400">
                        <Plus size={10} /> Added ({diff.added.length})
                      </p>
                      {diff.added.map((n) => {
                        const def = nodeRegistry.get(n.definitionId)
                        return (
                          <div key={n.id} className="mb-1.5 flex items-center gap-2 rounded border border-green-500/30 bg-green-500/5 px-2 py-1.5">
                            <span className="text-base leading-none">{def?.icon ?? '📦'}</span>
                            <span className="text-[11px] font-medium">{def?.label ?? n.definitionId}</span>
                            <span className="ml-auto text-[9px] font-mono text-muted-foreground">{n.id.slice(0, 8)}</span>
                          </div>
                        )
                      })}
                    </section>
                  )}

                  {/* Removed nodes */}
                  {diff.removed.length > 0 && (
                    <section>
                      <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                        <Minus size={10} /> Removed ({diff.removed.length})
                      </p>
                      {diff.removed.map((n) => {
                        const def = nodeRegistry.get(n.definitionId)
                        return (
                          <div key={n.id} className="mb-1.5 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/5 px-2 py-1.5 line-through opacity-70">
                            <span className="text-base leading-none">{def?.icon ?? '📦'}</span>
                            <span className="text-[11px] font-medium">{def?.label ?? n.definitionId}</span>
                            <span className="ml-auto text-[9px] font-mono text-muted-foreground">{n.id.slice(0, 8)}</span>
                          </div>
                        )
                      })}
                    </section>
                  )}

                  {/* Changed nodes */}
                  {diff.changed.length > 0 && (
                    <section>
                      <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">
                        <GitCompare size={10} /> Config Changed ({diff.changed.length})
                      </p>
                      {diff.changed.map((c) => {
                        const def = nodeRegistry.get(c.definition_id)
                        return (
                          <div key={c.node_id} className="mb-2 rounded border border-yellow-500/30 bg-yellow-500/5">
                            <div className="flex items-center gap-2 border-b border-yellow-500/20 px-2 py-1.5">
                              <span className="text-base leading-none">{def?.icon ?? '📦'}</span>
                              <span className="text-[11px] font-medium">{def?.label ?? c.definition_id}</span>
                            </div>
                            <div className="divide-y divide-border/30">
                              {Object.entries(c.config_diff).map(([key, { from, to }]) => (
                                <div key={key} className="grid grid-cols-[1fr_1fr_1fr] gap-1 px-2 py-1 text-[10px]">
                                  <span className="font-medium text-muted-foreground truncate">{key}</span>
                                  <span className="truncate font-mono text-red-400 line-through">{JSON.stringify(from)}</span>
                                  <span className="truncate font-mono text-green-400">{JSON.stringify(to)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </section>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
