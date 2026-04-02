import React, { useMemo, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { PipelineCanvas, usePipelineStore, validatePortTypes } from '@ai-ide/canvas-engine'
import type { PortTypeError } from '@ai-ide/canvas-engine'
import { nodeRegistry } from '@ai-ide/node-registry'
import type { PipelineType } from '@ai-ide/types'
import { NodePalette } from '../palette/NodePalette'
import { NodeInspector } from '../inspector/NodeInspector'
import { CodeGenPanel } from '../codegen/CodeGenPanel'
import { CanvasToolbar } from './CanvasToolbar'
import { LogPanel } from './LogPanel'
import { AgentPanel } from '../agent/AgentPanel'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ai-ide/ui'
import { Bot, CheckCircle2, XCircle, X } from 'lucide-react'
import { getApiBase } from '../../lib/api'
import { getNodeIntegrationDefaults, getIntegrationEnvVars } from '../../lib/integrations'

export function CanvasPage() {
  const { type = 'ml' } = useParams<{ type: string }>()
  const pipelineType = (type === 'llm' ? 'llm' : 'ml') as PipelineType
  const { resetPipeline, dag, updateNodeStatus } = usePipelineStore()

  const [isRunning, setIsRunning] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [showAgent, setShowAgent] = useState(false)
  const [validateResult, setValidateResult] = useState<PortTypeError[] | null>(null)

  const [showKubeflowDialog, setShowKubeflowDialog] = useState(false)
  const [kubeflowHost, setKubeflowHost] = useState('http://localhost:8080')
  const [kubeflowExperiment, setKubeflowExperiment] = useState('Default')

  // Switch pipeline mode when URL changes
  React.useEffect(() => {
    if (dag.pipeline !== pipelineType) {
      resetPipeline(pipelineType)
    }
  }, [pipelineType])

  const definitionMap = useMemo(() => nodeRegistry.toMap(), [])

  const startRun = useCallback(async (endpoint: string) => {
    if (dag.nodes.length === 0) return
    setRunError(null)
    dag.nodes.forEach((n) => updateNodeStatus(n.id, 'idle'))
    try {
      setIsRunning(true)
      setShowLogs(true)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dag, env_vars: getIntegrationEnvVars() }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Backend error ${res.status}: ${text}`)
      }
      const { run_id } = await res.json()
      setRunId(run_id)
    } catch (err) {
      const message = err instanceof TypeError && err.message.includes('fetch')
        ? 'Cannot reach backend. Start the FastAPI server on port 8000.'
        : String(err)
      setRunError(message)
      setIsRunning(false)
      setShowLogs(false)
    }
  }, [dag])

  const handleRun = useCallback(() => startRun(`${getApiBase()}/pipeline/run`), [startRun])
  const handleRunDocker = useCallback(() => startRun(`${getApiBase()}/pipeline/run-docker`), [startRun])
  const handleRunInstall = useCallback(() => startRun(`${getApiBase()}/pipeline/run-install`), [startRun])
  const handleRunDockerInstall = useCallback(() => startRun(`${getApiBase()}/pipeline/run-docker-install`), [startRun])
  const handleRunKubeflow = useCallback(() => setShowKubeflowDialog(true), [])

  const submitKubeflowRun = useCallback(async () => {
    setShowKubeflowDialog(false)
    if (dag.nodes.length === 0) return
    setRunError(null)
    dag.nodes.forEach((n) => updateNodeStatus(n.id, 'idle'))
    try {
      setIsRunning(true)
      setShowLogs(true)
      const res = await fetch(`${getApiBase()}/pipeline/run-kubeflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dag, kubeflow_host: kubeflowHost, experiment_name: kubeflowExperiment, env_vars: getIntegrationEnvVars() }),
      })
      if (!res.ok) throw new Error(`Backend error ${res.status}: ${await res.text()}`)
      const { run_id } = await res.json()
      setRunId(run_id)
    } catch (err) {
      const message = err instanceof TypeError && err.message.includes('fetch')
        ? 'Cannot reach backend. Start the FastAPI server on port 8000.'
        : String(err)
      setRunError(message)
      setIsRunning(false)
      setShowLogs(false)
    }
  }, [dag, kubeflowHost, kubeflowExperiment, updateNodeStatus])

  const handleValidate = useCallback(() => {
    const errors = validatePortTypes(dag, definitionMap)
    setValidateResult(errors)
  }, [dag, definitionMap])

  const handleStop = useCallback(async () => {
    setIsRunning(false)
  }, [])

  const handleLogsClose = useCallback(() => {
    setShowLogs(false)
    setIsRunning(false)
    setRunId(null)
  }, [])

  // Poll run status to detect completion
  React.useEffect(() => {
    if (!runId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBase()}/pipeline/${runId}/status`)
        const { status } = await res.json()
        if (status === 'success' || status === 'error') {
          setIsRunning(false)
          clearInterval(interval)
        }
      } catch {
        // ignore polling errors
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [runId])

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left: Node Palette */}
      <NodePalette pipeline={pipelineType} />

      {/* Center: Canvas + Code Gen */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CanvasToolbar
          onRun={handleRun}
          onRunDocker={handleRunDocker}
          onRunInstall={handleRunInstall}
          onRunDockerInstall={handleRunDockerInstall}
          onRunKubeflow={handleRunKubeflow}
          onStop={handleStop}
          onValidate={handleValidate}
          isRunning={isRunning}
          pipelineType={pipelineType}
        />

        {/* Run error banner */}
        {runError && (
          <div className="flex items-center justify-between gap-2 border-b border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
            <span>{runError}</span>
            <button onClick={() => setRunError(null)} className="shrink-0 text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Validate results panel */}
        {validateResult !== null && (
          <div className={`border-b px-3 py-2 text-xs ${validateResult.length === 0 ? 'border-green-500/30 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                {validateResult.length === 0
                  ? <><CheckCircle2 size={12} className="text-green-400" /><span className="text-green-400">All connections are type-compatible</span></>
                  : <><XCircle size={12} className="text-yellow-400" /><span className="text-yellow-400">{validateResult.length} type mismatch{validateResult.length > 1 ? 'es' : ''} found</span></>
                }
              </div>
              <button onClick={() => setValidateResult(null)} className="text-muted-foreground hover:text-foreground">
                <X size={12} />
              </button>
            </div>
            {validateResult.length > 0 && (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {validateResult.map((err) => (
                  <li key={err.edgeId} className="flex items-start gap-1.5 text-yellow-300/90">
                    <span className="mt-px shrink-0 rounded px-1 py-px text-[9px] font-mono" style={{ background: '#78350f' }}>
                      {err.sourceType} → {err.targetType}
                    </span>
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Tabs defaultValue="canvas" className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center border-b border-border bg-card px-3">
            <TabsList className="h-7 bg-transparent p-0 gap-1">
              <TabsTrigger value="canvas" className="h-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3">
                Canvas
              </TabsTrigger>
              <TabsTrigger value="code" className="h-6 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs px-3">
                Code
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="canvas" className="m-0 flex-1 overflow-hidden relative">
            <PipelineCanvas
              definitionMap={definitionMap}
              getNodeDefaults={getNodeIntegrationDefaults}
            />
            {/* Floating AI Agent button */}
            <button
              onClick={() => setShowAgent((v) => !v)}
              title="Pipeline Assistant"
              className={`absolute bottom-16 right-3 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg transition-colors ${
                showAgent
                  ? 'border-purple-500/60 bg-purple-500/20 text-purple-300'
                  : 'border-border bg-card text-muted-foreground hover:border-purple-500/40 hover:text-purple-300'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Assistant
            </button>
          </TabsContent>
          <TabsContent value="code" className="m-0 flex-1 overflow-hidden relative">
            <CodeGenPanel />
          </TabsContent>
        </Tabs>

        {/* Log panel slides in at the bottom when running */}
        {showLogs && (
          <LogPanel runId={runId} onClose={handleLogsClose} />
        )}
      </div>

      {/* Right: Inspector or Agent Panel */}
      {showAgent ? (
        <AgentPanel onClose={() => setShowAgent(false)} />
      ) : (
        <NodeInspector />
      )}

      {/* Kubeflow run dialog */}
      {showKubeflowDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-[440px] rounded-lg border border-border bg-card p-5 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold">Submit to Kubeflow Pipelines</h3>

            {/* Setup hint */}
            <div className="mb-4 rounded border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[10.5px] text-blue-300/80 space-y-1">
              <p className="font-medium text-blue-300">Required: port-forward the Istio ingress gateway</p>
              <p className="font-mono text-[10px] text-blue-200/70 select-all">kubectl port-forward svc/istio-ingressgateway -n istio-system 8080:80</p>
              <p>Then set the host to <span className="font-mono">http://localhost:8080</span> below.</p>
              <p className="mt-1 text-blue-300/60">Check pod health if submissions fail:<br />
                <span className="font-mono text-[10px]">kubectl get pods -n kubeflow</span></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">KFP API Host URL</label>
                <input
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  value={kubeflowHost}
                  onChange={(e) => setKubeflowHost(e.target.value)}
                  placeholder="http://localhost:8080"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Experiment Name</label>
                <input
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                  value={kubeflowExperiment}
                  onChange={(e) => setKubeflowExperiment(e.target.value)}
                  placeholder="Default"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowKubeflowDialog(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                onClick={submitKubeflowRun}
              >
                Submit Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
