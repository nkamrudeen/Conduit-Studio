import React from 'react'
import { Play, Square, RotateCcw, Save } from 'lucide-react'
import { Button } from '@ai-ide/ui'
import { usePipelineStore } from '@ai-ide/canvas-engine'

interface CanvasToolbarProps {
  onRun?: () => void
  onStop?: () => void
  isRunning?: boolean
}

export function CanvasToolbar({ onRun, onStop, isRunning }: CanvasToolbarProps) {
  const { dag, resetPipeline } = usePipelineStore()

  const saveToLocalStorage = () => {
    localStorage.setItem(`pipeline_${dag.id}`, JSON.stringify(dag))
  }

  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-1.5">
      <input
        className="h-6 rounded border border-transparent bg-transparent px-1 text-xs font-medium hover:border-border focus:border-border focus:outline-none"
        defaultValue={dag.name}
      />
      <span className="text-[10px] text-muted-foreground">{dag.nodes.length} nodes · {dag.edges.length} edges</span>

      <div className="ml-auto flex gap-1">
        <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={saveToLocalStorage}>
          <Save size={11} />
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-xs text-muted-foreground"
          onClick={() => resetPipeline(dag.pipeline)}
        >
          <RotateCcw size={11} />
          Reset
        </Button>
        {isRunning ? (
          <Button size="sm" variant="destructive" className="h-6 gap-1 text-xs" onClick={onStop}>
            <Square size={11} />
            Stop
          </Button>
        ) : (
          <Button size="sm" className="h-6 gap-1 text-xs" onClick={onRun} disabled={dag.nodes.length === 0}>
            <Play size={11} />
            Run
          </Button>
        )}
      </div>
    </div>
  )
}
