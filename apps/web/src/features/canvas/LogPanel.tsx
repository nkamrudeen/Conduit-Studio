import React, { useEffect, useRef, useState } from 'react'
import { X, Terminal } from 'lucide-react'
import { usePipelineStore } from '@ai-ide/canvas-engine'

interface LogEntry {
  type: 'log' | 'status' | 'error' | 'done' | 'node_output'
  text?: string
  stream?: 'stdout' | 'stderr'
  status?: string
  node_id?: string | null
  outputs?: unknown[]
  durationMs?: number
}

interface LogPanelProps {
  runId: string | null
  onClose: () => void
}

export function LogPanel({ runId, onClose }: LogPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [done, setDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const { updateNodeStatus, updateNodeResult } = usePipelineStore()

  useEffect(() => {
    if (!runId) return

    setEntries([])
    setDone(false)
    setConnected(false)

    const isElectron = navigator.userAgent.includes('Electron') || window.location.protocol === 'file:'
    const wsBase = isElectron ? 'ws://127.0.0.1:8000' : `ws://${window.location.host}`
    const wsUrl = `${wsBase}/pipeline/${runId}/logs`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (event) => {
      try {
        const msg: LogEntry = JSON.parse(event.data)

        if (msg.type === 'status' && msg.node_id) {
          const s = msg.status as 'running' | 'success' | 'error'
          if (s === 'running' || s === 'success' || s === 'error') {
            updateNodeStatus(msg.node_id, s)
          }
        }

        if (msg.type === 'node_output' && msg.node_id && Array.isArray(msg.outputs)) {
          updateNodeResult(msg.node_id, {
            outputs: msg.outputs as import('@ai-ide/types').NodeOutputPreview[],
            durationMs: msg.durationMs,
          })
          // Don't push node_output into the visible log entries
          return
        }

        setEntries((prev) => [...prev, msg])
        if (msg.type === 'done') {
          setDone(true)
          ws.close()
        }
      } catch {
        setEntries((prev) => [...prev, { type: 'log', text: event.data, stream: 'stdout' }])
      }
    }

    ws.onerror = () => {
      setEntries((prev) => [...prev, { type: 'error', text: 'WebSocket connection failed' }])
    }

    ws.onclose = () => setConnected(false)

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [runId, updateNodeStatus, updateNodeResult])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div
      style={{ fontFamily: 'monospace' }}
      className="flex h-52 flex-col border-t border-border bg-[#0a0f1e]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-1">
        <Terminal size={12} className="text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">Pipeline Logs</span>
        {runId && (
          <span className="text-[10px] text-muted-foreground opacity-50">
            run:{runId.slice(0, 8)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {connected && !done && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              running
            </span>
          )}
          {done && (
            <span className="text-[10px] text-green-400">✓ done</span>
          )}
          <button
            onClick={onClose}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-5">
        {entries.length === 0 && !done && (
          <span className="text-muted-foreground opacity-50">Waiting for output…</span>
        )}
        {entries.map((entry, i) => {
          if (entry.type === 'status') {
            if (!entry.node_id) {
              // Pipeline-level status
              const color = entry.status === 'error' ? 'text-red-400' : entry.status === 'success' ? 'text-green-400' : 'text-blue-400'
              return <div key={i} className={color}>▶ Pipeline {entry.status?.toUpperCase()}</div>
            }
            // Per-node status — shown inline
            const color = entry.status === 'error' ? 'text-red-400' : entry.status === 'success' ? 'text-green-400' : 'text-blue-300'
            const icon = entry.status === 'error' ? '✗' : entry.status === 'success' ? '✓' : '▶'
            return (
              <div key={i} className={`${color} opacity-70`}>
                {icon} [{entry.node_id?.slice(0, 12)}] {entry.status}
              </div>
            )
          }
          if (entry.type === 'error') {
            return <div key={i} className="text-red-400">✗ {entry.text}</div>
          }
          if (entry.type === 'done') {
            return <div key={i} className="text-green-400">✓ Pipeline finished</div>
          }
          return (
            <div
              key={i}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              className={entry.stream === 'stderr' ? 'text-yellow-300' : 'text-slate-300'}
            >
              {entry.text}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
