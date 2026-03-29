import React, { useState, useCallback } from 'react'
import { Bot, X, AlertTriangle, AlertCircle, Info, Lightbulb, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { nodeRegistry } from '@ai-ide/node-registry'

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
  node_id?: string
  fix?: string
}

interface NodeSuggestion {
  definition_id: string
  label: string
  reason: string
  category: string
}

interface AnalysisResult {
  issues: ValidationIssue[]
  suggestions: NodeSuggestion[]
  ai_analysis: string | null
  score: number
}

const SEVERITY_ICON = {
  error: <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />,
  info: <Info className="h-3.5 w-3.5 shrink-0 text-blue-400" />,
}

const SEVERITY_COLOR = {
  error: 'border-red-500/20 bg-red-500/5',
  warning: 'border-yellow-500/20 bg-yellow-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const r = 20
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="relative flex h-14 w-14 items-center justify-center">
      <svg className="absolute" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      </svg>
      <span className="text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

interface AgentPanelProps {
  onClose: () => void
}

export function AgentPanel({ onClose }: AgentPanelProps) {
  const { dag, addNode } = usePipelineStore()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (useAi = false) => {
    useAi ? setAiLoading(true) : setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dag, use_ai: useAi }),
      })
      if (!res.ok) throw new Error(`Backend error ${res.status}`)
      const data: AnalysisResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof TypeError && String(err).includes('fetch')
        ? 'Cannot reach backend. Start the FastAPI server on port 8000.'
        : String(err))
    } finally {
      setLoading(false)
      setAiLoading(false)
    }
  }, [dag])

  const handleAddNode = useCallback((definitionId: string) => {
    const def = nodeRegistry.get(definitionId)
    if (!def) return
    // Place new node to the right of the rightmost existing node
    const maxX = dag.nodes.reduce((m, n) => Math.max(m, n.position.x), 200)
    const avgY = dag.nodes.length > 0
      ? dag.nodes.reduce((s, n) => s + n.position.y, 0) / dag.nodes.length
      : 200
    addNode(definitionId, { x: maxX + 260, y: avgY })
  }, [dag.nodes, addNode])

  const issuesByType = result ? {
    error: result.issues.filter(i => i.severity === 'error'),
    warning: result.issues.filter(i => i.severity === 'warning'),
    info: result.issues.filter(i => i.severity === 'info'),
  } : null

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Bot className="h-4 w-4 text-purple-400" />
          Pipeline Assistant
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Action buttons */}
        <div className="flex gap-2 p-3">
          <button
            onClick={() => analyze(false)}
            disabled={loading || aiLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Validate
          </button>
          <button
            onClick={() => analyze(true)}
            disabled={loading || aiLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 disabled:opacity-50"
          >
            {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Ask AI
          </button>
        </div>

        {error && (
          <div className="mx-3 mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="px-3 pb-3 text-xs text-muted-foreground">
            Click <strong>Validate</strong> to check your pipeline for issues and get next-step suggestions.
            <br /><br />
            Click <strong>Ask AI</strong> to get Claude-powered analysis (requires <code>ANTHROPIC_API_KEY</code>).
          </div>
        )}

        {result && (
          <>
            {/* Score */}
            <div className="flex items-center gap-3 border-b border-border px-3 py-3">
              <ScoreRing score={result.score} />
              <div>
                <div className="font-medium text-foreground">
                  {result.score >= 80 ? 'Pipeline looks good!' : result.score >= 50 ? 'Needs attention' : 'Multiple issues found'}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {result.issues.length === 0 ? 'No issues detected' : `${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''} found`}
                </div>
              </div>
            </div>

            {/* Issues */}
            {result.issues.length > 0 && (
              <div className="border-b border-border px-3 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issues</div>
                <div className="flex flex-col gap-2">
                  {result.issues.map((issue, i) => (
                    <div key={i} className={`rounded border px-2.5 py-2 ${SEVERITY_COLOR[issue.severity]}`}>
                      <div className="flex items-start gap-2">
                        {SEVERITY_ICON[issue.severity]}
                        <span className="text-xs leading-snug text-foreground">{issue.message}</span>
                      </div>
                      {issue.fix && (
                        <div className="mt-1 pl-5 text-xs text-muted-foreground">{issue.fix}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className="border-b border-border px-3 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  Next Steps
                </div>
                <div className="flex flex-col gap-2">
                  {result.suggestions.map((sug, i) => (
                    <div key={i} className="rounded border border-border bg-background px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{sug.label}</span>
                        <button
                          onClick={() => handleAddNode(sug.definition_id)}
                          title="Add to canvas"
                          className="flex shrink-0 items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary hover:bg-primary/20"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                      </div>
                      <div className="mt-1 text-xs leading-snug text-muted-foreground">{sug.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {result.ai_analysis && (
              <div className="px-3 py-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-purple-400" />
                  AI Analysis
                </div>
                <div className="rounded border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {result.ai_analysis}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
