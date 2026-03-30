import React, { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { CheckCircle, Download, FolderOpen, Loader2, Package, RefreshCw } from 'lucide-react'
import { Button, Tabs, TabsList, TabsTrigger } from '@ai-ide/ui'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import type { CodeGenFormat } from '@ai-ide/types'
import { getApiBase } from '../../lib/api'
import { useProjectStore } from '../../store/projectStore'

const FORMATS: { id: CodeGenFormat; label: string }[] = [
  { id: 'python', label: 'Python Script' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'kubeflow', label: 'Kubeflow DSL' },
  { id: 'docker', label: 'Dockerfile' },
]

interface GeneratedCode {
  code: string
  filename: string
  warnings: string[]
  saved_files?: string[]
}

export function CodeGenPanel() {
  const { dag } = usePipelineStore()
  const { projectFolder } = useProjectStore()
  const [activeFormat, setActiveFormat] = useState<CodeGenFormat>('python')
  const [results, setResults] = useState<Partial<Record<CodeGenFormat, GeneratedCode>>>({})
  const [editedCode, setEditedCode] = useState<Partial<Record<CodeGenFormat, string>>>({})
  const [savedFormats, setSavedFormats] = useState<Partial<Record<CodeGenFormat, string[]>>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usePackageLayout, setUsePackageLayout] = useState(false)

  const generate = useCallback(async () => {
    if (dag.nodes.length === 0) return
    setEditedCode((prev) => { const next = { ...prev }; delete next[activeFormat]; return next })
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/codegen/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dag, format: activeFormat }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as GeneratedCode
      setResults((prev) => ({ ...prev, [activeFormat]: data }))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [dag, activeFormat])

  const saveToProject = useCallback(async () => {
    if (!projectFolder || dag.nodes.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/codegen/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dag,
          format: activeFormat,
          project_folder: projectFolder,
          use_package_layout: activeFormat === 'python' && usePackageLayout,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as GeneratedCode
      setResults((prev) => ({ ...prev, [activeFormat]: data }))
      if (data.saved_files && data.saved_files.length > 0) {
        setSavedFormats((prev) => ({ ...prev, [activeFormat]: data.saved_files! }))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }, [dag, activeFormat, projectFolder, usePackageLayout])

  const download = useCallback(() => {
    const result = results[activeFormat]
    if (!result) return
    const code = editedCode[activeFormat] ?? result.code
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }, [results, editedCode, activeFormat])

  const current = results[activeFormat]
  const savedFiles = savedFormats[activeFormat] ?? []
  const monacoLang =
    activeFormat === 'notebook' ? 'json' :
    activeFormat === 'docker' ? 'dockerfile' :
    'python'
  const folderName = projectFolder?.split(/[/\\]/).pop()
  const formatLabel = FORMATS.find((f) => f.id === activeFormat)?.label ?? activeFormat

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as CodeGenFormat)}>
          <TabsList className="h-7">
            {FORMATS.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="h-6 px-2 text-[11px]">
                {f.label}
                {editedCode[f.id] !== undefined && (
                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" title="Edited" />
                )}
                {savedFormats[f.id] && (
                  <span title="Saved to project"><CheckCircle size={9} className="ml-1 text-green-400" /></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Package layout toggle — only relevant for Python */}
          {activeFormat === 'python' && (
            <label className="flex cursor-pointer items-center gap-1 text-[10px] text-muted-foreground select-none">
              <Package size={11} />
              <input
                type="checkbox"
                checked={usePackageLayout}
                onChange={(e) => setUsePackageLayout(e.target.checked)}
                className="accent-primary"
              />
              Pkg layout
            </label>
          )}

          {editedCode[activeFormat] !== undefined && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-yellow-400 hover:text-yellow-300"
              onClick={() => setEditedCode((prev) => { const next = { ...prev }; delete next[activeFormat]; return next })}>
              Reset
            </Button>
          )}

          <Button
            size="sm" variant="outline" className="h-7 text-xs"
            onClick={generate}
            disabled={loading || saving || dag.nodes.length === 0}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Generate
          </Button>

          {projectFolder && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs text-primary border-primary/40 hover:bg-primary/10"
              onClick={saveToProject}
              disabled={loading || saving || dag.nodes.length === 0 || !current}
              title={`Save ${formatLabel} to ${projectFolder}`}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
              Save to {folderName}
            </Button>
          )}

          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={download} disabled={!current}>
            <Download size={12} />
            Export
          </Button>
        </div>
      </div>

      {/* Saved files notification */}
      {savedFiles.length > 0 && (
        <div className="border-b border-border bg-green-950/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-green-400">
            <CheckCircle size={12} />
            <span className="font-medium">
              Saved {formatLabel} ({savedFiles.length} {savedFiles.length === 1 ? 'file' : 'files'}) to project folder
            </span>
          </div>
          <div className="mt-1 space-y-0.5">
            {savedFiles.map((f) => (
              <div key={f} className="font-mono text-[10px] text-muted-foreground truncate">{f}</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-2 rounded bg-destructive/20 p-2 text-xs text-destructive-foreground">{error}</div>
        )}
        {current?.warnings.map((w, i) => (
          <div key={i} className="mx-2 mt-1 rounded bg-yellow-900/30 p-1.5 text-[10px] text-yellow-300">⚠ {w}</div>
        ))}
        {!current && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Click Generate to preview the {formatLabel}</span>
            {projectFolder && (
              <span className="text-[10px] text-muted-foreground/60">
                Generate first, then Save to write to {folderName}
              </span>
            )}
          </div>
        )}
        {current && (
          <Editor
            height="100%"
            language={monacoLang}
            value={editedCode[activeFormat] ?? current.code}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
            onChange={(val) => setEditedCode((prev) => ({ ...prev, [activeFormat]: val ?? '' }))}
          />
        )}
      </div>
    </div>
  )
}
