import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen, ChevronRight, Container, FileCode, FileText, FolderOpen,
  Loader2, RefreshCw, X, FolderPlus,
} from 'lucide-react'
import { ScrollArea } from '@ai-ide/ui'
import { getApiBase } from '../../lib/api'
import { useProjectStore } from '../../store/projectStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectFile {
  path: string
  abs_path: string
  size: number
  modified: number
  is_dir: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(file: ProjectFile) {
  if (file.is_dir) return <FolderOpen size={13} className="text-yellow-400 shrink-0" />
  const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'py')          return <FileCode size={13} className="text-blue-400 shrink-0" />
  if (ext === 'ipynb')       return <BookOpen size={13} className="text-orange-400 shrink-0" />
  if (ext === 'dockerfile' || file.path.toLowerCase() === 'dockerfile')
                             return <Container size={13} className="text-cyan-400 shrink-0" />
  if (ext === 'toml' || ext === 'txt' || ext === 'yaml' || ext === 'yml')
                             return <FileText size={13} className="text-muted-foreground shrink-0" />
  return <FileText size={13} className="text-muted-foreground shrink-0" />
}

// Build a tree from a flat list of {path, ...} entries (sorted depth-first by backend)
interface TreeNode {
  name: string
  file: ProjectFile
  children: TreeNode[]
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = []
  const map = new Map<string, TreeNode>()

  for (const file of files) {
    const parts = file.path.split('/')
    const name = parts[parts.length - 1] ?? file.path
    const node: TreeNode = { name, file, children: [] }
    map.set(file.path, node)

    if (parts.length === 1) {
      root.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      const parent = map.get(parentPath)
      if (parent) parent.children.push(node)
      else root.push(node) // orphan — shouldn't happen
    }
  }

  return root
}

// ── FileNode ─────────────────────────────────────────────────────────────────

function FileNode({
  node, depth, selected, onSelect,
}: {
  node: TreeNode
  depth: number
  selected: string | null
  onSelect: (f: ProjectFile) => void
}) {
  const [open, setOpen] = useState(depth === 0)
  const isSelected = selected === node.file.abs_path

  return (
    <div>
      <button
        onClick={() => {
          if (node.file.is_dir) setOpen((v) => !v)
          else onSelect(node.file)
        }}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        className={`flex w-full items-center gap-1.5 py-0.5 pr-2 text-left text-[11px] transition-colors rounded
          ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
      >
        {node.file.is_dir && (
          <ChevronRight size={10} className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        )}
        {!node.file.is_dir && <span className="w-2.5 shrink-0" />}
        {fileIcon(node.file)}
        <span className="truncate flex-1">{node.name}</span>
        {!node.file.is_dir && (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">{formatSize(node.file.size)}</span>
        )}
      </button>
      {node.file.is_dir && open && node.children.map((child) => (
        <FileNode key={child.file.path} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ── SetFolderDialog ───────────────────────────────────────────────────────────

function SetFolderDialog({ onClose, onSet }: { onClose: () => void; onSet: (p: string) => void }) {
  const [value, setValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSet = async () => {
    if (!value.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/project/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: value.trim(), create: true }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail ?? 'Failed to create folder')
      }
      const data = await res.json() as { folder: string }
      onSet(data.folder)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[420px] rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Set Project Folder</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Generated code, notebooks, Dockerfiles, and uploaded data files will be saved here.
        </p>
        <input
          ref={inputRef}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs
            focus:border-primary focus:outline-none font-mono"
          placeholder="e.g. C:\projects\my-pipeline  or  /home/user/my-pipeline"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSet() }}
        />
        {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={handleSet}
            disabled={creating || !value.trim()}
            className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium
              text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? <Loader2 size={11} className="animate-spin" /> : <FolderPlus size={11} />}
            Set Folder
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FileBrowserPanel ──────────────────────────────────────────────────────────

export function FileBrowserPanel() {
  const { projectFolder, setProjectFolder, clearProjectFolder } = useProjectStore()
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const refresh = useCallback(async () => {
    if (!projectFolder) return
    setLoading(true)
    try {
      const res = await fetch(`${getApiBase()}/project/files?folder=${encodeURIComponent(projectFolder)}`)
      if (!res.ok) throw new Error('Failed to list files')
      const data = await res.json() as { files: ProjectFile[] }
      setFiles(data.files)
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [projectFolder])

  useEffect(() => { refresh() }, [refresh])

  const handleSelect = async (file: ProjectFile) => {
    setSelected(file.abs_path)
    if (file.is_dir) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch(`${getApiBase()}/project/file?path=${encodeURIComponent(file.abs_path)}`)
      if (!res.ok) throw new Error('Cannot load file')
      setPreview(await res.text())
    } catch {
      setPreview('(cannot preview this file)')
    } finally {
      setPreviewLoading(false)
    }
  }

  const tree = buildTree(files)
  const folderName = projectFolder ? projectFolder.split(/[/\\]/).pop() : null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <FolderOpen size={13} className="text-primary shrink-0" />
        <span className="text-xs font-semibold flex-1 truncate">
          {folderName ?? 'Project Files'}
        </span>
        <button
          title="Refresh"
          onClick={refresh}
          disabled={!projectFolder || loading}
          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
        <button
          title="Set project folder"
          onClick={() => setShowDialog(true)}
          className="text-muted-foreground hover:text-foreground text-[10px] font-medium px-1.5 py-0.5
            rounded border border-border hover:border-primary/50 transition-colors"
        >
          {projectFolder ? 'Change' : 'Set Folder'}
        </button>
      </div>

      {/* Folder path */}
      {projectFolder && (
        <div className="flex items-center gap-1 border-b border-border px-3 py-1">
          <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground" title={projectFolder}>
            {projectFolder}
          </span>
          <button onClick={clearProjectFolder} className="text-muted-foreground hover:text-red-400">
            <X size={10} />
          </button>
        </div>
      )}

      {!projectFolder ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <FolderOpen size={32} className="text-muted-foreground/40" />
          <p className="text-[11px] text-muted-foreground">
            No project folder set.<br />Generated files and uploads will be saved here.
          </p>
          <button
            onClick={() => setShowDialog(true)}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Set Folder
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* File tree */}
          <ScrollArea className={`${preview !== null ? 'h-1/2' : 'flex-1'} border-b border-border`}>
            <div className="py-1">
              {files.length === 0 && !loading && (
                <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                  Folder is empty. Generate code or upload a file to get started.
                </p>
              )}
              {tree.map((node) => (
                <FileNode
                  key={node.file.path}
                  node={node}
                  depth={0}
                  selected={selected}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Preview pane */}
          {preview !== null && (
            <div className="flex h-1/2 flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-3 py-1">
                <span className="flex-1 truncate font-mono text-[10px] text-muted-foreground">
                  {selected?.split(/[/\\]/).pop()}
                </span>
                <button onClick={() => { setPreview(null); setSelected(null) }} className="text-muted-foreground hover:text-foreground">
                  <X size={11} />
                </button>
              </div>
              <ScrollArea className="flex-1">
                {previewLoading ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <pre className="p-3 font-mono text-[10px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
                    {preview}
                  </pre>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {showDialog && (
        <SetFolderDialog
          onClose={() => setShowDialog(false)}
          onSet={setProjectFolder}
        />
      )}
    </div>
  )
}
