import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Square, RotateCcw, FolderOpen, Download, Save, ChevronDown, Box, ShieldCheck, Cpu, Package, Cloud, Folder, X, AlertCircle } from 'lucide-react'
import { Button } from '@ai-ide/ui'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import { useProjectStore } from '../../store/projectStore'
import type { PipelineDAG } from '@ai-ide/types'

const AUTOSAVE_KEY = 'conduitcraft:autosave'
const FILE_EXT = '.ccraft'

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

// ---------------------------------------------------------------------------
// Project folder prompt — shown after loading a file when no folder is set
// ---------------------------------------------------------------------------
function ProjectFolderPrompt({ onClose }: { onClose: () => void }) {
  const { projectFolder, setProjectFolder } = useProjectStore()
  const [path, setPath] = useState(projectFolder ?? '')

  const handleSave = () => {
    const trimmed = path.trim()
    if (trimmed) setProjectFolder(trimmed)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[420px] rounded-lg border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Folder size={15} className="text-primary shrink-0" />
            <h2 className="text-sm font-semibold">Set Project Folder</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
          Set a project folder so generated code, notebooks, and uploaded data are saved alongside your pipeline file.
          You can change this anytime in the <strong>File Browser</strong> panel.
        </p>

        <input
          autoFocus
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder={
            navigator.platform.startsWith('Win')
              ? 'C:\\Users\\you\\my-project'
              : '/home/you/my-project'
          }
          className="mb-4 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main toolbar
// ---------------------------------------------------------------------------
export function CanvasToolbar({ onRun, onRunDocker, onRunInstall, onRunDockerInstall, onRunKubeflow, onStop, onValidate, isRunning, pipelineType }: CanvasToolbarProps) {
  const { dag, setDag, resetPipeline } = usePipelineStore()
  const { projectFolder } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null)
  const [showFolderPrompt, setShowFolderPrompt] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Auto-save to localStorage 1.5s after any dag change
  useEffect(() => {
    if (dag.nodes.length === 0) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(dag))
        const t = new Date()
        setAutoSavedAt(`${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`)
      } catch { /* storage full — ignore */ }
    }, 1500)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [dag])

  const downloadToFile = useCallback(() => {
    const json = JSON.stringify(dag, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dag.name.toLowerCase().replace(/\s+/g, '_')}${FILE_EXT}`
    a.click()
    URL.revokeObjectURL(url)
  }, [dag])

  const saveToProjectFolder = useCallback(async () => {
    if (!projectFolder) {
      setShowFolderPrompt(true)
      return
    }
    setSaveStatus('saving')
    try {
      const res = await fetch('http://localhost:8000/project/save-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: projectFolder, dag }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [dag, projectFolder])

  const loadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const loaded = JSON.parse(ev.target?.result as string) as PipelineDAG
        setDag(loaded)
        // Prompt for project folder if not already set
        if (!projectFolder) setShowFolderPrompt(true)
      } catch {
        alert('Invalid pipeline file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const disabled = dag.nodes.length === 0

  return (
    <>
      {showFolderPrompt && <ProjectFolderPrompt onClose={() => setShowFolderPrompt(false)} />}

      <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-1.5">
        <input
          className="h-6 rounded border border-transparent bg-transparent px-1 text-xs font-medium hover:border-border focus:border-border focus:outline-none"
          defaultValue={dag.name}
          key={dag.id}
        />
        <span className="text-[10px] text-muted-foreground">{dag.nodes.length} nodes · {dag.edges.length} edges</span>
        {autoSavedAt && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60" title="Auto-saved to browser storage">
            <Cloud size={9} />
            {autoSavedAt}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Save to project folder — primary action */}
          <Button
            size="sm"
            variant={saveStatus === 'saved' ? 'default' : 'outline'}
            className={[
              'h-6 gap-1 text-xs font-medium',
              saveStatus === 'saved' ? 'bg-green-600 text-white hover:bg-green-600 border-green-600' : '',
              saveStatus === 'error' ? 'border-destructive text-destructive' : '',
            ].join(' ')}
            onClick={saveToProjectFolder}
            disabled={dag.nodes.length === 0 || saveStatus === 'saving'}
            title={projectFolder ? `Save to ${projectFolder}` : 'Save to project folder'}
          >
            {saveStatus === 'error' ? <AlertCircle size={11} /> : <Save size={11} />}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
          </Button>
          {/* Download as .ccraft file */}
          <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs text-muted-foreground" onClick={downloadToFile} title={`Download pipeline as ${FILE_EXT} file`} disabled={dag.nodes.length === 0}>
            <Download size={11} />
            Download
          </Button>
          <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={() => fileInputRef.current?.click()} title="Load pipeline from .ccraft or .json file">
            <FolderOpen size={11} />
            Load
          </Button>
          <input ref={fileInputRef} type="file" accept=".ccraft,.json" className="hidden" onChange={loadFromFile} />
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
              <Button
                size="sm"
                className="h-6 gap-1 rounded-r-none border-r border-primary-foreground/20 text-xs"
                onClick={onRun}
                disabled={disabled}
              >
                <Play size={11} />
                Run
              </Button>
              <Button
                size="sm"
                className="h-6 w-5 rounded-l-none px-0 text-xs"
                onClick={() => setDropdownOpen((v) => !v)}
                disabled={disabled}
                title="More run options"
              >
                <ChevronDown size={10} />
              </Button>

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
    </>
  )
}
