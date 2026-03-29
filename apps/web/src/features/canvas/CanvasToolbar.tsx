import React, { useRef, useState, useEffect } from 'react'
import { Play, Square, RotateCcw, FolderOpen, Download, ChevronDown, Box, ShieldCheck, Cpu, Package } from 'lucide-react'
import { Button } from '@ai-ide/ui'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import type { PipelineDAG } from '@ai-ide/types'

interface CanvasToolbarProps {
  onRun?: () => void
  onRunDocker?: () => void
  onRunInstall?: () => void
  onRunDockerInstall?: () => void
  onRunKubeflow?: () => void
  onStop?: () => void
  onValidate?: () => void
  isRunning?: boolean
  pipelineType?: 'ml' | 'llm'
}

export function CanvasToolbar({ onRun, onRunDocker, onRunInstall, onRunDockerInstall, onRunKubeflow, onStop, onValidate, isRunning, pipelineType }: CanvasToolbarProps) {
  const { dag, setDag, resetPipeline } = usePipelineStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const saveToFile = () => {
    const json = JSON.stringify(dag, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dag.name.toLowerCase().replace(/\s+/g, '_')}.pipeline.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const loaded = JSON.parse(ev.target?.result as string) as PipelineDAG
        setDag(loaded)
      } catch {
        alert('Invalid pipeline file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const disabled = dag.nodes.length === 0

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-1.5">
      <input
        className="h-6 rounded border border-transparent bg-transparent px-1 text-xs font-medium hover:border-border focus:border-border focus:outline-none"
        defaultValue={dag.name}
        key={dag.id}
      />
      <span className="text-[10px] text-muted-foreground">{dag.nodes.length} nodes · {dag.edges.length} edges</span>

      <div className="ml-auto flex gap-1">
        <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={saveToFile} title="Save pipeline to JSON file">
          <Download size={11} />
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={() => fileInputRef.current?.click()} title="Load pipeline from JSON file">
          <FolderOpen size={11} />
          Load
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={loadFromFile} />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-xs text-muted-foreground"
          onClick={() => resetPipeline(dag.pipeline)}
        >
          <RotateCcw size={11} />
          Reset
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-xs text-muted-foreground hover:text-yellow-400"
          onClick={onValidate}
          disabled={disabled}
          title="Validate port type compatibility"
        >
          <ShieldCheck size={11} />
          Validate
        </Button>

        {/* Run split button */}
        {isRunning ? (
          <Button size="sm" variant="destructive" className="h-6 gap-1 text-xs" onClick={onStop}>
            <Square size={11} />
            Stop
          </Button>
        ) : (
          <div ref={dropdownRef} className="relative flex">
            {/* Primary Run action */}
            <Button
              size="sm"
              className="h-6 gap-1 rounded-r-none border-r border-primary-foreground/20 text-xs"
              onClick={onRun}
              disabled={disabled}
            >
              <Play size={11} />
              Run
            </Button>
            {/* Chevron to open dropdown */}
            <Button
              size="sm"
              className="h-6 w-5 rounded-l-none px-0 text-xs"
              onClick={() => setDropdownOpen((v) => !v)}
              disabled={disabled}
              title="More run options"
            >
              <ChevronDown size={10} />
            </Button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded border border-border bg-popover shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  onClick={() => { setDropdownOpen(false); onRun?.() }}
                >
                  <Play size={11} className="text-primary" />
                  <span>Run Locally</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  onClick={() => { setDropdownOpen(false); onRunDocker?.() }}
                >
                  <Box size={11} className="text-blue-400" />
                  <span>Run as Docker</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  onClick={() => { setDropdownOpen(false); onRunInstall?.() }}
                >
                  <Package size={11} className="text-green-400" />
                  <span>Run (install deps)</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  onClick={() => { setDropdownOpen(false); onRunDockerInstall?.() }}
                >
                  <Package size={11} className="text-blue-300" />
                  <span>Docker (install deps)</span>
                </button>
                {pipelineType === 'ml' && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted border-t border-border mt-1 pt-2"
                    onClick={() => { setDropdownOpen(false); onRunKubeflow?.() }}
                  >
                    <Cpu size={11} className="text-orange-400" />
                    <span>Run on Kubeflow</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
