import React, { useState } from 'react'
import { Loader2, Bug, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@ai-ide/ui'
import { getApiBase } from '../../lib/api'
import type { NodeDefinition } from '@ai-ide/types'

interface RetrievalDebuggerProps {
  nodeId: string
  definition: NodeDefinition
  config: Record<string, unknown>
}

interface RetrievedChunk {
  text: string
  score: number | null
  source: string
  metadata: Record<string, string>
}

interface DebugResult {
  ok: boolean
  query: string
  chunks: RetrievedChunk[]
  assembled_prompt: string
  response: string
  error?: string
}

const DEFAULT_PROMPT =
  'Answer the question based on the context.\n\nContext: {context}\n\nQuestion: {question}'

export function RetrievalDebugger({ definition, config }: RetrievalDebuggerProps) {
  const [query, setQuery] = useState('')
  const [k, setK] = useState(4)
  const [promptTemplate, setPromptTemplate] = useState(
    (config.prompt_template as string) || DEFAULT_PROMPT
  )
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null)

  // Derive vectorstore and llm types from the node definition id
  // The RAG chain node is always llm.chain.rag and is connected upstream to a vectorstore + llm node.
  // We pass the node config directly since it may carry overrides.
  const vsType = (config.vectorstore_type as string) || 'chroma'
  const llmType = (config.llm_type as string) || 'openai'

  const handleRun = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${getApiBase()}/debug/retrieval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorstore_type: vsType,
          vectorstore_config: config,
          llm_type: llmType,
          llm_config: config,
          query: query.trim(),
          k,
          prompt_template: promptTemplate,
        }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ ok: false, query, chunks: [], assembled_prompt: '', response: '', error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Bug size={11} />
        Retrieval Debugger
      </div>

      {/* Query input */}
      <div>
        <label className="mb-0.5 block text-[11px] font-medium">Test Query</label>
        <textarea
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Enter a test question…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun() } }}
        />
      </div>

      {/* K + run */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">Top k</label>
          <input
            type="number"
            min={1} max={20}
            className="h-6 w-12 rounded border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
          />
        </div>
        <Button
          size="sm"
          className="h-6 flex-1 text-xs"
          onClick={handleRun}
          disabled={loading || !query.trim()}
        >
          {loading ? <><Loader2 size={10} className="animate-spin" /> Running…</> : 'Run Debug'}
        </Button>
      </div>

      {/* Collapsible prompt template editor */}
      <div className="rounded border border-border">
        <button
          className="flex w-full items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setPromptOpen((v) => !v)}
        >
          {promptOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          Prompt Template
        </button>
        {promptOpen && (
          <textarea
            rows={4}
            className="w-full resize-none border-t border-border bg-muted/30 px-2 py-1.5 font-mono text-[10px] focus:outline-none"
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
          />
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {!result.ok && result.error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-[10px] text-red-400">
              {result.error}
            </div>
          )}

          {/* Retrieved chunks */}
          {result.chunks.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Retrieved Chunks ({result.chunks.length})
              </p>
              <div className="space-y-1.5">
                {result.chunks.map((chunk, i) => (
                  <div key={i} className="rounded border border-border bg-muted/20">
                    <button
                      className="flex w-full items-start gap-2 px-2 py-1.5 text-left"
                      onClick={() => setExpandedChunk(expandedChunk === i ? null : i)}
                    >
                      <span className="shrink-0 rounded bg-primary/20 px-1 text-[9px] font-bold text-primary">
                        #{i + 1}
                      </span>
                      {chunk.score !== null && (
                        <span className={[
                          'shrink-0 rounded px-1 text-[9px] font-mono',
                          chunk.score > 0.7 ? 'bg-green-500/20 text-green-400' :
                          chunk.score > 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400',
                        ].join(' ')}>
                          {chunk.score.toFixed(3)}
                        </span>
                      )}
                      <span className="flex-1 truncate text-[10px] text-foreground">
                        {chunk.text.slice(0, 80)}…
                      </span>
                      {expandedChunk === i ? <ChevronDown size={10} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={10} className="shrink-0 text-muted-foreground" />}
                    </button>
                    {expandedChunk === i && (
                      <div className="border-t border-border px-2 pb-2 pt-1.5">
                        <p className="mb-1 whitespace-pre-wrap break-words text-[10px] text-foreground leading-relaxed">
                          {chunk.text}
                        </p>
                        {chunk.source && (
                          <p className="text-[9px] text-muted-foreground">
                            Source: <span className="font-mono">{chunk.source}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assembled prompt */}
          {result.assembled_prompt && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assembled Prompt
              </p>
              <pre className="max-h-32 overflow-y-auto rounded border border-border bg-muted/30 p-2 text-[9px] font-mono whitespace-pre-wrap break-words">
                {result.assembled_prompt}
              </pre>
            </div>
          )}

          {/* Final response */}
          {result.response && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Response
              </p>
              <div className="rounded border border-green-500/30 bg-green-500/5 p-2 text-[10px] leading-relaxed text-foreground whitespace-pre-wrap">
                {result.response}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
