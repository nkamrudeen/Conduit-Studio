import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { GitBranch, Puzzle, Settings, FlaskConical, Brain } from 'lucide-react'
import { cn } from '@ai-ide/ui'

export function IDELayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-primary">⚙ AI-IDE</span>
          <span className="text-xs text-muted-foreground">MLOps & LLMOps Visual IDE</span>
        </div>

        <nav className="flex items-center gap-1">
          <PipelineTab to="/pipeline/ml" icon={<FlaskConical size={13} />} label="ML Pipeline" />
          <PipelineTab to="/pipeline/llm" icon={<Brain size={13} />} label="LLM Pipeline" />
        </nav>

        <div className="flex items-center gap-2 text-muted-foreground">
          <button className="rounded p-1.5 hover:bg-accent hover:text-foreground" title="Plugins">
            <Puzzle size={15} />
          </button>
          <button className="rounded p-1.5 hover:bg-accent hover:text-foreground" title="Integrations">
            <GitBranch size={15} />
          </button>
          <button className="rounded p-1.5 hover:bg-accent hover:text-foreground" title="Settings">
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Outlet />
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
