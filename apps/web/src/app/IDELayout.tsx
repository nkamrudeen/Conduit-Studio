import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { GitBranch, Puzzle, Settings, FlaskConical, Brain, Layers, HelpCircle, X } from 'lucide-react'
import { cn } from '@ai-ide/ui'
import { IntegrationsPanel } from '../features/integrations/IntegrationsPanel'
import { SettingsPanel } from '../features/settings/SettingsPanel'

type SidePanel = 'integrations' | 'settings' | null

export function IDELayout() {
  const [sidePanel, setSidePanel] = useState<SidePanel>(null)

  const togglePanel = (panel: SidePanel) =>
    setSidePanel((prev) => (prev === panel ? null : panel))

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <img src="/icon.svg?v=2" alt="Conduit Studio" className="h-6 w-6" />
          <span className="text-base font-bold text-primary">Conduit Studio</span>
          <span className="text-xs text-muted-foreground">MLOps & LLMOps Visual Pipeline IDE</span>
        </div>

        <nav className="flex items-center gap-1">
          <PipelineTab to="/pipeline/ml" icon={<FlaskConical size={13} />} label="ML Pipeline" />
          <PipelineTab to="/pipeline/llm" icon={<Brain size={13} />} label="LLM Pipeline" />
          <PipelineTab to="/samples" icon={<Layers size={13} />} label="Samples" />
          <PipelineTab to="/plugins" icon={<Puzzle size={13} />} label="Plugins" />
          <PipelineTab to="/help" icon={<HelpCircle size={13} />} label="Help" />
        </nav>

        <div className="flex items-center gap-2 text-muted-foreground">
          <button
            className={cn(
              'rounded p-1.5 hover:bg-accent hover:text-foreground',
              sidePanel === 'integrations' && 'bg-accent text-foreground'
            )}
            title="Integrations"
            onClick={() => togglePanel('integrations')}
          >
            <GitBranch size={15} />
          </button>
          <button
            className={cn(
              'rounded p-1.5 hover:bg-accent hover:text-foreground',
              sidePanel === 'settings' && 'bg-accent text-foreground'
            )}
            title="Settings"
            onClick={() => togglePanel('settings')}
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Outlet />

        {/* Side panel (Integrations or Settings) */}
        {sidePanel && (
          <div className="relative flex h-full w-80 shrink-0 flex-col border-l border-border bg-card">
            <button
              onClick={() => setSidePanel(null)}
              className="absolute right-2 top-2 z-10 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
            {sidePanel === 'integrations' && <IntegrationsPanel />}
            {sidePanel === 'settings' && <SettingsPanel />}
          </div>
        )}
      </div>
    </div>
  )
}

function PipelineTab({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
