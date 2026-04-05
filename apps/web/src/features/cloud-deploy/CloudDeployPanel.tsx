import React, { useState } from 'react'
import { Check, X, Loader2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { Button, Input, ScrollArea } from '@ai-ide/ui'
import { getApiBase } from '../../lib/api'
import { usePipelineStore } from '@ai-ide/canvas-engine'

// ── Types ──────────────────────────────────────────────────────────────────

interface WorkspaceConfig {
  subscription_id: string
  resource_group: string
  workspace_name: string
  tenant_id: string
  client_id: string
  client_secret: string
}

interface JobState {
  status: 'idle' | 'submitting' | 'submitted' | 'polling' | 'error'
  jobName?: string
  jobStatus?: string
  studioUrl?: string
  message?: string
}

interface EndpointState {
  status: 'idle' | 'deploying' | 'deployed' | 'error'
  endpointName?: string
  scoringUri?: string
  message?: string
}

interface ConnState {
  status: 'idle' | 'testing' | 'ok' | 'error'
  message?: string
}

type CloudTab = 'azure' | 'aws' | 'gcp'

const STORAGE_KEY = 'conduitcraft:cloud-deploy'

function loadConfig(): WorkspaceConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      subscription_id: saved.subscription_id ?? '',
      resource_group: saved.resource_group ?? '',
      workspace_name: saved.workspace_name ?? '',
      tenant_id: saved.tenant_id ?? '',
      client_id: saved.client_id ?? '',
      client_secret: saved.client_secret ?? '',
    }
  } catch {
    return { subscription_id: '', resource_group: '', workspace_name: '', tenant_id: '', client_id: '', client_secret: '' }
  }
}

function saveConfig(cfg: WorkspaceConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
    >
      {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      {label}
    </button>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: 'text' | 'password' | 'url'; hint?: string
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[11px] font-medium">{label}</label>
      <Input
        type={type}
        className="h-7 text-xs"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="mt-0.5 text-[9px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function StatusBadge({ state }: { state: 'idle' | 'testing' | 'submitting' | 'submitted' | 'polling' | 'deploying' | 'deployed' | 'ok' | 'error' }) {
  if (state === 'idle') return null
  const map: Record<string, { label: string; cls: string }> = {
    testing:    { label: 'Testing…',    cls: 'text-muted-foreground' },
    submitting: { label: 'Submitting…', cls: 'text-muted-foreground' },
    polling:    { label: 'Running…',    cls: 'text-yellow-400' },
    submitted:  { label: 'Submitted',   cls: 'text-green-400' },
    deploying:  { label: 'Deploying…',  cls: 'text-muted-foreground' },
    deployed:   { label: 'Deployed',    cls: 'text-green-400' },
    ok:         { label: 'Connected',   cls: 'text-green-400' },
    error:      { label: 'Error',       cls: 'text-red-400' },
  }
  const { label, cls } = map[state] ?? { label: state, cls: '' }
  return <span className={`text-[10px] font-medium ${cls}`}>{label}</span>
}

// ── Azure Panel ─────────────────────────────────────────────────────────────

function AzurePanel() {
  const [cfg, setCfg] = useState<WorkspaceConfig>(loadConfig)
  const [cfgSaved, setCfgSaved] = useState(false)
  const [conn, setConn] = useState<ConnState>({ status: 'idle' })

  // Job submission state
  const [jobSection, setJobSection] = useState(true)
  const [compute, setCompute] = useState('')
  const [experimentName, setExperimentName] = useState('conduitcraft-pipeline')
  const [environment, setEnvironment] = useState('')
  const [jobState, setJobState] = useState<JobState>({ status: 'idle' })

  // Endpoint deployment state
  const [endpointSection, setEndpointSection] = useState(true)
  const [endpointName, setEndpointName] = useState('')
  const [modelName, setModelName] = useState('')
  const [instanceType, setInstanceType] = useState('Standard_DS3_v2')
  const [instanceCount, setInstanceCount] = useState(1)
  const [endpointState, setEndpointState] = useState<EndpointState>({ status: 'idle' })

  const dag = usePipelineStore((s) => s.dag)

  const setField = (key: keyof WorkspaceConfig) => (v: string) =>
    setCfg((prev) => ({ ...prev, [key]: v }))

  const handleSaveCfg = () => {
    saveConfig(cfg)
    setCfgSaved(true)
    setTimeout(() => setCfgSaved(false), 2000)
  }

  const handleTestConn = async () => {
    setConn({ status: 'testing' })
    try {
      const res = await fetch(`${getApiBase()}/cloud-deploy/azure/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: cfg }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setConn({ status: 'ok', message: data.message })
      } else {
        setConn({ status: 'error', message: data.detail ?? data.message ?? 'Connection failed' })
      }
    } catch (err) {
      setConn({ status: 'error', message: String(err) })
    }
  }

  const handleSubmitJob = async () => {
    setJobState({ status: 'submitting' })
    try {
      const res = await fetch(`${getApiBase()}/cloud-deploy/azure/job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: cfg,
          dag,
          compute,
          experiment_name: experimentName,
          environment,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setJobState({
          status: 'submitted',
          jobName: data.job_name,
          jobStatus: data.status,
          studioUrl: data.studio_url,
          message: `Job ${data.job_name} submitted`,
        })
        // Start polling
        pollJobStatus(data.job_name)
      } else {
        setJobState({ status: 'error', message: data.detail ?? 'Submission failed' })
      }
    } catch (err) {
      setJobState({ status: 'error', message: String(err) })
    }
  }

  const pollJobStatus = async (jobName: string) => {
    setJobState((prev) => ({ ...prev, status: 'polling', jobName }))
    let attempts = 0
    const maxAttempts = 60 // 5 min at 5s intervals

    const poll = async () => {
      if (attempts++ >= maxAttempts) return
      try {
        const res = await fetch(`${getApiBase()}/cloud-deploy/azure/job/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace: cfg, job_name: jobName }),
        })
        const data = await res.json().catch(() => ({}))
        const terminal = ['Completed', 'Failed', 'Canceled', 'NotStarted']
        setJobState((prev) => ({
          ...prev,
          jobStatus: data.status,
          studioUrl: data.studio_url ?? prev.studioUrl,
          status: terminal.includes(data.status)
            ? (data.status === 'Completed' ? 'submitted' : 'error')
            : 'polling',
          message: `Status: ${data.status}`,
        }))
        if (!terminal.includes(data.status)) {
          setTimeout(poll, 5000)
        }
      } catch {
        setTimeout(poll, 10000)
      }
    }
    setTimeout(poll, 3000)
  }

  const handleDeployEndpoint = async () => {
    setEndpointState({ status: 'deploying' })
    try {
      const res = await fetch(`${getApiBase()}/cloud-deploy/azure/endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace: cfg,
          endpoint_name: endpointName,
          model_name: modelName,
          instance_type: instanceType,
          instance_count: instanceCount,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setEndpointState({
          status: 'deployed',
          endpointName: data.endpoint_name,
          scoringUri: data.scoring_uri,
          message: `Endpoint '${data.endpoint_name}' deployed`,
        })
      } else {
        setEndpointState({ status: 'error', message: data.detail ?? 'Deployment failed' })
      }
    } catch (err) {
      setEndpointState({ status: 'error', message: String(err) })
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Workspace Connection */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="mb-2 text-[11px] font-semibold">Workspace Connection</p>
        <div className="space-y-2">
          <Field label="Subscription ID" value={cfg.subscription_id} onChange={setField('subscription_id')} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          <Field label="Resource Group" value={cfg.resource_group} onChange={setField('resource_group')} placeholder="my-resource-group" />
          <Field label="Workspace Name" value={cfg.workspace_name} onChange={setField('workspace_name')} placeholder="my-ml-workspace" />
          <Field label="Tenant ID (optional)" value={cfg.tenant_id} onChange={setField('tenant_id')} placeholder="xxxxxxxx-xxxx-…" hint="Required for service principal auth" />
          <Field label="Client ID (optional)" value={cfg.client_id} onChange={setField('client_id')} placeholder="app/client ID" />
          <Field label="Client Secret (optional)" value={cfg.client_secret} onChange={setField('client_secret')} placeholder="secret value" type="password" hint="Leave blank to use DefaultAzureCredential (az login / managed identity)" />
        </div>

        {conn.message && (
          <p className={`mt-2 text-[10px] ${conn.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {conn.message}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={handleSaveCfg}>
            {cfgSaved ? <><Check size={10} /> Saved</> : 'Save'}
          </Button>
          <Button
            size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground"
            onClick={handleTestConn}
            disabled={conn.status === 'testing'}
          >
            {conn.status === 'testing' ? <><Loader2 size={10} className="animate-spin" /> Testing…</> : 'Test Connection'}
          </Button>
          {conn.status === 'ok' && <Check size={13} className="text-green-400" />}
          {conn.status === 'error' && <X size={13} className="text-red-400" />}
        </div>
      </div>

      {/* Pipeline Job Submission */}
      <div className="rounded-lg border border-border bg-card p-3">
        <SectionHeader label="Pipeline Job Submission" open={jobSection} onToggle={() => setJobSection((v) => !v)} />

        {jobSection && (
          <div className="mt-2 space-y-2">
            <Field
              label="Compute Cluster"
              value={compute}
              onChange={setCompute}
              placeholder="cpu-cluster"
              hint="Azure ML compute cluster name"
            />
            <Field
              label="Experiment Name"
              value={experimentName}
              onChange={setExperimentName}
              placeholder="conduitcraft-pipeline"
            />
            <Field
              label="Environment (optional)"
              value={environment}
              onChange={setEnvironment}
              placeholder="azureml:AzureML-sklearn-1.0-ubuntu20.04-py38-cpu:1"
              hint="Leave blank to use default sklearn environment"
            />

            {jobState.message && (
              <p className={`text-[10px] ${jobState.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {jobState.message}
              </p>
            )}

            {jobState.studioUrl && (
              <a
                href={jobState.studioUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink size={10} /> View in Azure ML Studio
              </a>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                className="h-6 text-xs"
                onClick={handleSubmitJob}
                disabled={jobState.status === 'submitting' || jobState.status === 'polling'}
              >
                {(jobState.status === 'submitting' || jobState.status === 'polling')
                  ? <><Loader2 size={10} className="animate-spin" /> {jobState.status === 'submitting' ? 'Submitting…' : 'Polling…'}</>
                  : 'Submit Job'}
              </Button>
              <StatusBadge state={jobState.status} />
              {jobState.jobStatus && (
                <span className="text-[10px] text-muted-foreground">{jobState.jobStatus}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Endpoint Deployment */}
      <div className="rounded-lg border border-border bg-card p-3">
        <SectionHeader label="Endpoint Deployment" open={endpointSection} onToggle={() => setEndpointSection((v) => !v)} />

        {endpointSection && (
          <div className="mt-2 space-y-2">
            <Field
              label="Endpoint Name"
              value={endpointName}
              onChange={setEndpointName}
              placeholder="my-endpoint"
              hint="Lowercase alphanumeric and hyphens only"
            />
            <Field
              label="Registered Model"
              value={modelName}
              onChange={setModelName}
              placeholder="azureml:my-model:1"
              hint="Format: azureml:name:version"
            />
            <div>
              <label className="mb-0.5 block text-[11px] font-medium">Instance Type</label>
              <select
                className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={instanceType}
                onChange={(e) => setInstanceType(e.target.value)}
              >
                <option value="Standard_DS3_v2">Standard_DS3_v2 (4 vCPU, 14GB)</option>
                <option value="Standard_DS2_v2">Standard_DS2_v2 (2 vCPU, 7GB)</option>
                <option value="Standard_F4s_v2">Standard_F4s_v2 (4 vCPU, 8GB)</option>
                <option value="Standard_NC6s_v3">Standard_NC6s_v3 (GPU)</option>
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium">Instance Count</label>
              <Input
                type="number"
                className="h-7 text-xs"
                value={instanceCount}
                min={1}
                max={10}
                onChange={(e) => setInstanceCount(Number(e.target.value))}
              />
            </div>

            {endpointState.message && (
              <p className={`text-[10px] ${endpointState.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {endpointState.message}
              </p>
            )}

            {endpointState.scoringUri && (
              <div className="rounded border border-border bg-muted/40 px-2 py-1">
                <p className="text-[9px] text-muted-foreground mb-0.5">Scoring URI</p>
                <code className="text-[10px] break-all font-mono">{endpointState.scoringUri}</code>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                className="h-6 text-xs"
                onClick={handleDeployEndpoint}
                disabled={endpointState.status === 'deploying'}
              >
                {endpointState.status === 'deploying'
                  ? <><Loader2 size={10} className="animate-spin" /> Deploying…</>
                  : 'Deploy Endpoint'}
              </Button>
              <StatusBadge state={endpointState.status} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Disabled provider tab content ──────────────────────────────────────────

function ComingSoonProvider({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="text-3xl grayscale">{icon}</span>
      <p className="text-sm font-medium text-muted-foreground">{name} — Coming Soon</p>
      <p className="text-[10px] text-muted-foreground">
        AWS and GCP cloud deployment support is planned for a future release.
      </p>
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function CloudDeployPanel() {
  const [tab, setTab] = useState<CloudTab>('azure')

  const tabs: { id: CloudTab; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'azure', label: 'Azure ML', icon: '🔷' },
    { id: 'aws',   label: 'AWS',      icon: '🟠', disabled: true },
    { id: 'gcp',   label: 'GCP',      icon: '🌐', disabled: true },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Cloud Deployment</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Submit pipeline jobs and deploy model endpoints to cloud ML platforms.
        </p>
      </div>

      {/* Provider tabs */}
      <div className="flex shrink-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            className={[
              'flex flex-1 items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors',
              t.disabled
                ? 'cursor-not-allowed opacity-40 text-muted-foreground'
                : tab === t.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
            title={t.disabled ? 'Coming soon' : undefined}
          >
            <span className={t.disabled ? 'grayscale' : ''}>{t.icon}</span>
            {t.label}
            {t.disabled && (
              <span className="ml-0.5 rounded bg-muted px-1 py-px text-[8px]">soon</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1">
        {tab === 'azure' && <AzurePanel />}
        {tab === 'aws'   && <ComingSoonProvider name="AWS SageMaker" icon="🟠" />}
        {tab === 'gcp'   && <ComingSoonProvider name="Google Vertex AI" icon="🌐" />}
      </ScrollArea>
    </div>
  )
}
