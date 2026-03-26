import React, { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Download, RefreshCw, Loader2 } from 'lucide-react'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@ai-ide/ui'
import { usePipelineStore } from '@ai-ide/canvas-engine'
import type { CodeGenFormat } from '@ai-ide/types'

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
}

export function CodeGenPanel() {
  const { dag } = usePipelineStore()
  const [activeFormat, setActiveFormat] = useState<CodeGenFormat>('python')
  const [results, setResults] = useState<Partial<Record<CodeGenFormat, GeneratedCode>>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (dag.nodes.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/codegen/generate', {
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

  const download = useCallback(() => {
    const result = results[activeFormat]
    if (!result) return
    const blob = new Blob([result.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }, [results, activeFormat])

  const current = results[activeFormat]
  const monacoLang =
    activeFormat === 'notebook' ? 'json' :
    activeFormat === 'docker' ? 'dockerfile' :
    'python'

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as CodeGenFormat)}>
          <TabsList className="h-7">
            {FORMATS.map((f) => (
              <TabsTrigger key={f.id} value={f.id} className="h-6 px-2 text-[11px]">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={generate} disabled={loading || dag.nodes.length === 0}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Generate
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={download} disabled={!current}>
            <Download size={12} />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="m-2 rounded bg-destructive/20 p-2 text-xs text-destructive-foreground">{error}</div>
        )}
        {current?.warnings.map((w, i) => (
          <div key={i} className="mx-2 mt-1 rounded bg-yellow-900/30 p-1.5 text-[10px] text-yellow-300">⚠ {w}</div>
        ))}
        {!current && !loading && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Click Generate to preview the code
          </div>
        )}
        {current && (
          <Editor
            height="100%"
            language={monacoLang}
            value={current.code}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        )}
      </div>
    </div>
  )
}
