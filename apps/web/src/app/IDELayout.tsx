import React, { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { FolderTree, GitBranch, Puzzle, Settings, FlaskConical, Brain, Layers, HelpCircle, X } from 'lucide-react'
import { cn } from '@ai-ide/ui'
import { IntegrationsPanel } from '../features/integrations/IntegrationsPanel'
import { SettingsPanel } from '../features/settings/SettingsPanel'
import { FileBrowserPanel } from '../features/files/FileBrowserPanel'

type SidePanel = 'integrations' | 'settings' | 'files' | null

export function IDELayout() {
  const [sidePanel, setSidePanel] = useState<SidePanel>(null)

  const togglePanel = (panel: SidePanel) =>
    setSidePanel((prev) => (prev === panel ? null : panel))

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <ConduitLogo className="h-6 w-6" />
          <span className="text-base font-bold text-primary">ConduitCraft AI</span>
          <span className="text-xs text-muted-foreground">MLOps & LLMOps Visual Pipeline IDE by ConduitCraft</span>
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
              sidePanel === 'files' && 'bg-accent text-foreground'
            )}
            title="Project Files"
            onClick={() => togglePanel('files')}
          >
            <FolderTree size={15} />
          </button>
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
            {sidePanel === 'files' && <FileBrowserPanel />}
            {sidePanel === 'integrations' && <IntegrationsPanel />}
            {sidePanel === 'settings' && <SettingsPanel />}
          </div>
        )}
      </div>
    </div>
  )
}

function ConduitLogo({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id="cshex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c026d3"/>
          <stop offset="50%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#0891b2"/>
        </linearGradient>
        <filter id="csneon" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1"/>
          <feColorMatrix in="blur1" type="matrix"
            values="0 0 0 0 0.8 0 0 0 0 0 0 0 0 0 1 0 0 0 1 0" result="glow1"/>
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur2"/>
          <feMerge>
            <feMergeNode in="glow1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="csdot" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <polygon points="16,2.5 27,8.8 27,23.2 16,29.5 5,23.2 5,8.8" fill="url(#cshex)" filter="url(#csneon)"/>
      <polygon points="16,5.5 24.2,10.2 24.2,21.8 16,26.5 7.8,21.8 7.8,10.2" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6"/>
      <line x1="13" y1="15.8" x2="14.3" y2="12.5" stroke="#e879f9" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="17.7" y1="12.5" x2="19" y2="15.8" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10.8" cy="17.2" r="2.6" fill="#f0abfc" filter="url(#csdot)"/>
      <circle cx="16"   cy="11.2" r="2.6" fill="#fde68a" filter="url(#csdot)"/>
      <circle cx="21.2" cy="17.2" r="2.6" fill="#67e8f9" filter="url(#csdot)"/>
    </svg>
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
