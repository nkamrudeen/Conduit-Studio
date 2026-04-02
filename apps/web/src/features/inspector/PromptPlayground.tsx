import React, { useState, useRef, useEffect } from 'react'
import { Play, Save, Trash2, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { getApiBase } from '../../lib/api'
import type { NodeDefinition } from '@ai-ide/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PromptVersion {
  version: number
  label: string
  prompt: string
  system_prompt: string
  saved_at: string
}

interface PromptPlaygroundProps {
  nodeId: string
  definition: NodeDefinition
  config: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Version storage key (localStorage fallback when backend unavailable)
// ---------------------------------------------------------------------------
const lsKey = (nodeId: string) => `conduitcraft:playground:${nodeId}`

function loadVersionsLocal(nodeId: string): PromptVersion[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(nodeId)) ?? '[]')
  } catch {
    return []
  }
}

function saveVersionsLocal(nodeId: string, versions: PromptVersion[]) {
  localStorage.setItem(lsKey(nodeId), JSON.stringify(versions))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function PromptPlayground({ nodeId, definition, config }: PromptPlaygroundProps) {
  const [prompt, setPrompt] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(
    String(config.system_prompt ?? '')
  )
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [versions, setVersions] = useState<PromptVersion[]>(() => loadVersionsLocal(nodeId))
  const [showVersions, setShowVersions] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Reload versions when node changes
  useEffect(() => {
    setVersions(loadVersionsLocal(nodeId))
    setOutput('')
    setError(null)
  }, [nodeId])

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const run = async () => {
    if (!prompt.trim() || streaming) return
    setOutput('')
    setError(null)
    setStreaming(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${getApiBase()}/playground/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition_id: definition.id,
          config,
          prompt: prompt.trim(),
          system_prompt: systemPrompt.trim(),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Server error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const msg = JSON.parse(payload)
            if (msg.error) {
              setError(msg.error)
            } else if (msg.token) {
              setOutput((prev) => prev + msg.token)
            }
          } catch { /* ignore malformed line */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Connection failed — is the backend running?')
      }
    } finally {
      setStreaming(false)
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const saveVersion = () => {
    if (!prompt.trim()) return
    const next: PromptVersion[] = [
      ...versions,
      {
        version: versions.length + 1,
        label: `v${versions.length + 1}`,
        prompt: prompt.trim(),
        system_prompt: systemPrompt.trim(),
        saved_at: new Date().toISOString(),
      },
    ]
    setVersions(next)
    saveVersionsLocal(nodeId, next)

    // Best-effort save to backend too
    fetch(`${getApiBase()}/playground/versions/${nodeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: nodeId,
        definition_id: definition.id,
        prompt: prompt.trim(),
        system_prompt: systemPrompt.trim(),
      }),
    }).catch(() => { /* backend optional */ })
  }

  const loadVersion = (v: PromptVersion) => {
    setPrompt(v.prompt)
    setSystemPrompt(v.system_prompt)
    setShowVersions(false)
  }

  const deleteVersion = (versionNum: number) => {
    const next = versions.filter((v) => v.version !== versionNum)
    setVersions(next)
    saveVersionsLocal(nodeId, next)
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* System prompt */}
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Optional system prompt…"
          rows={2}
          className="w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* User prompt */}
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run() }}
          placeholder="Type your prompt… (Ctrl+Enter to run)"
          rows={4}
          className="w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Action row */}
      <div className="flex gap-1.5">
        <button
          onClick={streaming ? stop : run}
          disabled={!prompt.trim() && !streaming}
          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {streaming ? (
            <><Loader2 size={11} className="animate-spin" /> Stop</>
          ) : (
            <><Play size={11} /> Run</>
          )}
        </button>
        <button
          onClick={saveVersion}
          disabled={!prompt.trim()}
          title="Save prompt as a new version"
          className="flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
        >
          <Save size={11} />
          Save
        </button>
        <button
          onClick={() => setShowVersions((v) => !v)}
          title="Version history"
          className="flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-accent"
        >
          <Clock size={11} />
          {versions.length > 0 && (
            <span className="rounded-full bg-primary px-1 py-0 text-[9px] text-primary-foreground">
              {versions.length}
            </span>
          )}
          {showVersions ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {/* Version history panel */}
      {showVersions && (
        <div className="rounded border border-border bg-background">
          {versions.length === 0 ? (
            <p className="p-3 text-[11px] text-muted-foreground">No saved versions yet.</p>
          ) : (
            <ul>
              {[...versions].reverse().map((v) => (
                <li
                  key={v.version}
                  className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <button
                    onClick={() => loadVersion(v)}
                    className="flex-1 text-left"
                  >
                    <span className="text-[11px] font-medium text-foreground">{v.label}</span>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                      {v.prompt}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60">
                      {new Date(v.saved_at).toLocaleString()}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteVersion(v.version)}
                    className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-destructive"
                  >
                    <Trash2 size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Output */}
      {(output || error || streaming) && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Response
          </p>
          <div
            ref={outputRef}
            className="max-h-48 overflow-y-auto rounded border border-border bg-muted/40 px-2.5 py-2 text-xs leading-relaxed"
          >
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <>
                <span className="whitespace-pre-wrap">{output}</span>
                {streaming && <span className="animate-pulse text-primary">▌</span>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
