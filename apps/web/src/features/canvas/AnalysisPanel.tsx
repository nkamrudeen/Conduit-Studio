import React from 'react'
import { X, AlertTriangle, AlertCircle, CheckCircle2, DollarSign, Package, HardDrive } from 'lucide-react'

export interface ConflictItem {
  package_a: string
  package_b: string
  severity: 'error' | 'warning'
  message: string
}

export interface CostItem {
  node_id: string
  definition_id: string
  model: string
  cost_per_1m_input: number
  cost_per_1m_output: number
  note: string
}

export interface AnalysisResult {
  packages: string[]
  conflicts: ConflictItem[]
  cost_items: CostItem[]
  total_cost_range: { min_usd: number; max_usd: number }
  total_size_mb: number
  heavy_packages: string[]
}

interface AnalysisPanelProps {
  result: AnalysisResult
  onClose: () => void
}

export function AnalysisPanel({ result, onClose }: AnalysisPanelProps) {
  const errors = result.conflicts.filter((c) => c.severity === 'error')
  const warnings = result.conflicts.filter((c) => c.severity === 'warning')
  const hasIssues = result.conflicts.length > 0

  return (
    <div className="border-b border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-semibold">
          {hasIssues
            ? <><AlertTriangle size={12} className="text-yellow-400" /><span className="text-yellow-400">Pipeline analysis — {result.conflicts.length} issue{result.conflicts.length > 1 ? 's' : ''} found</span></>
            : <><CheckCircle2 size={12} className="text-green-400" /><span className="text-green-400">Pipeline analysis — no conflicts detected</span></>
          }
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {/* Conflicts */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertCircle size={9} /> Package Conflicts
          </p>
          {result.conflicts.length === 0 ? (
            <p className="text-[10px] text-green-400/80">No conflicts</p>
          ) : (
            <ul className="space-y-1 max-h-28 overflow-y-auto">
              {errors.map((c, i) => (
                <li key={i} className="rounded bg-red-500/10 border border-red-500/20 px-1.5 py-1">
                  <span className="font-mono text-[9px] text-red-400">{c.package_a} × {c.package_b}</span>
                  <p className="text-[9px] text-red-300/80 mt-0.5 leading-relaxed">{c.message}</p>
                </li>
              ))}
              {warnings.map((c, i) => (
                <li key={i} className="rounded bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-1">
                  <span className="font-mono text-[9px] text-yellow-400">{c.package_a} × {c.package_b}</span>
                  <p className="text-[9px] text-yellow-300/80 mt-0.5 leading-relaxed">{c.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cost Estimate */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <DollarSign size={9} /> API Cost Estimate
          </p>
          {result.cost_items.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/60">No LLM API nodes</p>
          ) : (
            <>
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {result.cost_items.map((item) => (
                  <li key={item.node_id} className="text-[9px] text-blue-200/80 leading-relaxed">
                    <span className="font-mono text-blue-300">{item.model}</span>
                    {item.cost_per_1m_input > 0
                      ? <> — ${item.cost_per_1m_input}/1M in, ${item.cost_per_1m_output}/1M out</>
                      : <span className="text-green-400"> — free (local)</span>
                    }
                    {item.note && <p className="text-muted-foreground/50">{item.note}</p>}
                  </li>
                ))}
              </ul>
              {result.total_cost_range.max_usd > 0 && (
                <p className="text-[10px] font-medium text-blue-300 mt-1">
                  Est. per 1K calls: ${result.total_cost_range.min_usd.toFixed(3)} – ${result.total_cost_range.max_usd.toFixed(3)}
                </p>
              )}
            </>
          )}
        </div>

        {/* Packages & Size */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Package size={9} /> Dependencies
          </p>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {result.packages.map((pkg) => (
              <span
                key={pkg}
                className={[
                  'rounded px-1 py-px text-[9px] font-mono',
                  result.heavy_packages.includes(pkg)
                    ? 'bg-orange-500/15 text-orange-300 border border-orange-500/20'
                    : 'bg-muted text-muted-foreground',
                ].join(' ')}
                title={result.heavy_packages.includes(pkg) ? 'Large package (>100 MB)' : undefined}
              >
                {pkg}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mt-1">
            <HardDrive size={9} />
            <span>~{result.total_size_mb >= 1000 ? `${(result.total_size_mb / 1000).toFixed(1)} GB` : `${result.total_size_mb} MB`} estimated install size</span>
          </div>
          {result.heavy_packages.length > 0 && (
            <p className="text-[9px] text-orange-300/80">
              <span className="font-medium">Large:</span> {result.heavy_packages.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
