import React, { useState } from 'react'
import { ScrollArea } from '@ai-ide/ui'
import { SecretsPanel } from './SecretsPanel'

interface SettingRow {
  key: string
  label: string
  description: string
  type: 'toggle' | 'select' | 'text'
  options?: string[]
  defaultValue: string | boolean
}

const SETTINGS: SettingRow[] = [
  {
    key: 'theme',
    label: 'Color Theme',
    description: 'Visual theme for the IDE.',
    type: 'select',
    options: ['Dark', 'Light', 'System'],
    defaultValue: 'Dark',
  },
  {
    key: 'autosave',
    label: 'Auto-save Pipeline',
    description: 'Save the current pipeline to localStorage on every change.',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'backend_url',
    label: 'Backend URL',
    description: 'FastAPI server URL used for code generation and pipeline execution.',
    type: 'text',
    defaultValue: 'http://localhost:8000',
  },
  {
    key: 'codegen_format',
    label: 'Default Code Format',
    description: 'Format shown by default in the Code tab.',
    type: 'select',
    options: ['Python Script', 'Notebook', 'Kubeflow DSL', 'Dockerfile'],
    defaultValue: 'Python Script',
  },
  {
    key: 'show_minimap',
    label: 'Show Minimap',
    description: 'Display the minimap in the canvas.',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'show_grid',
    label: 'Show Canvas Grid',
    description: 'Display background dot grid on the canvas.',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'snap_to_grid',
    label: 'Snap to Grid',
    description: 'Snap nodes to a grid when dragging.',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'edge_type',
    label: 'Edge Style',
    description: 'Visual style of connections between nodes.',
    type: 'select',
    options: ['Smooth Step', 'Bezier', 'Straight'],
    defaultValue: 'Smooth Step',
  },
  {
    key: 'plugin_dir',
    label: 'Plugin Directory',
    description: 'Directory scanned for community plugins (Electron only).',
    type: 'text',
    defaultValue: '~/.aiide/plugins',
  },
]

type SettingsTab = 'general' | 'secrets'

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(SETTINGS.map((s) => [s.key, s.defaultValue]))
  )
  const [saved, setSaved] = useState(false)

  const set = (key: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  const save = () => {
    try {
      localStorage.setItem('aiide-settings', JSON.stringify(values))
    } catch {
      // ignore storage errors
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-xs font-semibold text-foreground">Settings</p>
        <p className="text-[10px] text-muted-foreground">IDE preferences and configuration</p>
      </div>

      {/* Tab switcher */}
      <div className="flex shrink-0 border-b border-border">
        {(['general', 'secrets'] as SettingsTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex flex-1 items-center justify-center py-1.5 text-[11px] font-medium capitalize transition-colors',
              tab === t ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Secrets tab */}
      {tab === 'secrets' && (
        <ScrollArea className="flex-1">
          <SecretsPanel />
        </ScrollArea>
      )}

      {/* General tab */}
      {tab === 'general' && (
        <>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {SETTINGS.map((setting) => (
                <div key={setting.key} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{setting.label}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{setting.description}</p>
                  </div>
                  <div className="shrink-0">
                    {setting.type === 'toggle' && (
                      <button
                        onClick={() => set(setting.key, !values[setting.key])}
                        className={[
                          'relative h-5 w-9 rounded-full transition-colors',
                          values[setting.key] ? 'bg-primary' : 'bg-muted',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                            values[setting.key] ? 'translate-x-4' : 'translate-x-0.5',
                          ].join(' ')}
                        />
                      </button>
                    )}
                    {setting.type === 'select' && (
                      <select
                        className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={String(values[setting.key])}
                        onChange={(e) => set(setting.key, e.target.value)}
                      >
                        {setting.options!.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {setting.type === 'text' && (
                      <input
                        type="text"
                        className="h-7 w-48 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={String(values[setting.key])}
                        onChange={(e) => set(setting.key, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-border px-4 py-3">
            <button
              onClick={save}
              className="w-full rounded bg-primary py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              {saved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
