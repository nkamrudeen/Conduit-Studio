import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { getApiBase } from '../../lib/api'
import { useProjectStore } from '../../store/projectStore'

export function SecretsPanel() {
  const { projectFolder } = useProjectStore()
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const vaultDir = projectFolder ?? '~/.conduitcraft/vault'

  const fetchNames = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/vault/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_dir: vaultDir }),
      })
      const data = await res.json()
      if (res.ok) setNames(data.names ?? [])
      else setError(data.detail ?? 'Failed to load secrets')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNames() }, [vaultDir])

  const handleAdd = async () => {
    const name = newName.trim().toUpperCase()
    if (!name || !newValue) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/vault/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_dir: vaultDir, name, value: newValue }),
      })
      const data = await res.json()
      if (res.ok) {
        setNewName('')
        setNewValue('')
        await fetchNames()
      } else {
        setError(data.detail ?? 'Failed to save secret')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (name: string) => {
    setDeleting(name)
    try {
      await fetch(`${getApiBase()}/vault/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_dir: vaultDir, name }),
      })
      await fetchNames()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4 px-4 py-3">
      <div>
        <p className="text-xs font-semibold">Secrets Vault</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
          Store API keys and credentials as named references. Use <code className="font-mono">$MY_KEY</code> in node config fields — generated code renders them as <code className="font-mono">os.environ["MY_KEY"]</code>.
        </p>
        <p className="mt-1 text-[9px] text-muted-foreground">
          Stored encrypted in <code className="font-mono">{vaultDir}/.secrets.json</code>
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-[10px] text-red-400">
          {error}
        </div>
      )}

      {/* Existing secrets */}
      {loading ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 size={11} className="animate-spin" /> Loading…
        </div>
      ) : names.length > 0 ? (
        <div className="rounded-md border border-border overflow-hidden">
          {names.map((name) => (
            <div key={name} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0">
              <KeyRound size={11} className="shrink-0 text-primary" />
              <code className="flex-1 text-[11px] font-mono">${name}</code>
              <span className="text-[9px] text-muted-foreground font-mono">os.environ["{name}"]</span>
              <button
                onClick={() => handleDelete(name)}
                disabled={deleting === name}
                className="ml-1 text-muted-foreground hover:text-red-400 disabled:opacity-50"
                title="Delete secret"
              >
                {deleting === name ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">No secrets stored yet.</p>
      )}

      {/* Add new */}
      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Add Secret</p>
        <div>
          <label className="mb-0.5 block text-[11px] font-medium">Name</label>
          <input
            type="text"
            className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="OPENAI_API_KEY"
            value={newName}
            onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[11px] font-medium">Value</label>
          <div className="flex gap-1">
            <input
              type={showValue ? 'text' : 'password'}
              className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="sk-…"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <button
              onClick={() => setShowValue((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded border border-input bg-background text-muted-foreground hover:text-foreground"
            >
              {showValue ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !newName.trim() || !newValue}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={11} />}
          {saving ? 'Saving…' : 'Add Secret'}
        </button>
      </div>
    </div>
  )
}
