import React, { useState, useEffect } from 'react'
import { Check, Copy, X, Loader2, ExternalLink, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button, Input, ScrollArea } from '@ai-ide/ui'
import { getApiBase } from '../../lib/api'
import { useProjectStore } from '../../store/projectStore'

interface FieldDef {
  key: string
  label: string
  placeholder: string
  defaultValue?: string
  hint?: string
  type?: 'text' | 'password' | 'url'
  envVar?: string
  /** Vault key to use when envVar is absent for password fields */
  vaultKey?: string
}

interface IntegrationConfig {
  label: string
  icon: string
  description: string
  fields: FieldDef[]
  testEndpoint?: string
  testParams?: (cfg: Record<string, string>) => Record<string, string | undefined>
  docsUrl?: string
  disabled?: boolean
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    label: 'MLflow',
    icon: '📊',
    description: 'Experiment tracking, model registry and artifact logging.',
    fields: [
      { key: 'tracking_uri', label: 'Tracking URI', placeholder: 'http://localhost:5000', defaultValue: 'http://localhost:5000', type: 'url' },
      { key: 'experiment_name', label: 'Default Experiment Name', placeholder: 'my_experiment', defaultValue: 'my_experiment' },
      { key: 'artifact_root', label: 'Artifact Root (optional)', placeholder: 'mlflow-artifacts:/' },
    ],
    testEndpoint: '/integrations/test/mlflow',
    testParams: (cfg) => ({ tracking_uri: cfg['tracking_uri'] }),
    docsUrl: 'https://mlflow.org/docs/latest/tracking.html',
  },
  {
    label: 'Kubeflow Pipelines',
    icon: '☸️',
    description: 'Submit and monitor ML pipelines on Kubernetes.',
    fields: [
      { key: 'host', label: 'Kubeflow Host', placeholder: 'http://localhost:8080', defaultValue: 'http://localhost:8080', type: 'url' },
      { key: 'namespace', label: 'Namespace', placeholder: 'kubeflow', defaultValue: 'kubeflow' },
      {
        key: 'token',
        label: 'Bearer Token (if auth enabled)',
        placeholder: 'Paste token here…',
        type: 'password',
        vaultKey: 'KFP_TOKEN',
        hint: 'Browser: DevTools → Application → Cookies → oauth2_proxy_kubeflow (or authservice_session on older installs)  |  kubectl: kubectl -n kubeflow create token ml-pipeline',
      },
    ],
    testEndpoint: '/integrations/test/kubeflow',
    testParams: (cfg) => ({ host: cfg['host'], token: cfg['token'] }),
    docsUrl: 'https://www.kubeflow.org/docs/components/pipelines/',
  },
  {
    label: 'HuggingFace Hub',
    icon: '🤗',
    description: 'Download models, push to Hub, and use the Inference API.',
    fields: [
      { key: 'token', label: 'Access Token', placeholder: 'hf_…', type: 'password', envVar: 'HF_TOKEN' },
      { key: 'username', label: 'Username (for repo_id prefix)', placeholder: 'your-hf-username' },
      { key: 'cache_dir', label: 'Local Cache Dir (optional)', placeholder: '~/.cache/huggingface', defaultValue: '~/.cache/huggingface' },
    ],
    testEndpoint: '/integrations/test/huggingface',
    testParams: (cfg) => ({ token: cfg['token'] }),
    docsUrl: 'https://huggingface.co/docs/hub/security-tokens',
  },
  {
    label: 'OpenAI',
    icon: '🧠',
    description: 'GPT-4, embeddings, and other OpenAI APIs.',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-…', type: 'password', envVar: 'OPENAI_API_KEY' },
      { key: 'base_url', label: 'Base URL (optional)', placeholder: 'https://api.openai.com/v1', defaultValue: 'https://api.openai.com/v1', type: 'url' },
      { key: 'org_id', label: 'Organization ID (optional)', placeholder: 'org-…' },
    ],
    testEndpoint: '/integrations/test/openai',
    testParams: (cfg) => ({ api_key: cfg['api_key'], base_url: cfg['base_url'] }),
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    label: 'Anthropic',
    icon: '⚡',
    description: 'Claude models via the Anthropic API.',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-ant-…', type: 'password', envVar: 'ANTHROPIC_API_KEY' },
    ],
    testEndpoint: '/integrations/test/anthropic',
    testParams: (cfg) => ({ api_key: cfg['api_key'] }),
    docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
  },
  {
    label: 'AWS S3',
    icon: '🪣',
    description: 'S3 bucket access for data ingestion and artifact storage.',
    fields: [
      { key: 'aws_access_key_id', label: 'Access Key ID', placeholder: 'AKIA…', type: 'password', envVar: 'AWS_ACCESS_KEY_ID' },
      { key: 'aws_secret_access_key', label: 'Secret Access Key', placeholder: '…', type: 'password', envVar: 'AWS_SECRET_ACCESS_KEY' },
      { key: 'aws_region', label: 'Default Region', placeholder: 'us-east-1', defaultValue: 'us-east-1' },
      { key: 'default_bucket', label: 'Default Bucket (optional)', placeholder: 'my-ml-bucket' },
    ],
    testEndpoint: '/integrations/test/s3',
    testParams: (cfg) => ({
      aws_access_key_id: cfg['aws_access_key_id'],
      aws_secret_access_key: cfg['aws_secret_access_key'],
      aws_region: cfg['aws_region'],
      default_bucket: cfg['default_bucket'],
    }),
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    disabled: true,
  },
  {
    label: 'Azure Blob Storage',
    icon: '🔷',
    description: 'Load files from Azure Blob Storage into your pipeline.',
    fields: [
      { key: 'connection_string', label: 'Connection String', placeholder: 'DefaultEndpointsProtocol=https;…', type: 'password', envVar: 'AZURE_STORAGE_CONNECTION_STRING' },
      { key: 'default_container', label: 'Default Container (optional)', placeholder: 'my-container' },
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/azure/storage/blobs/',
    disabled: true,
  },
  {
    label: 'Google Cloud Storage',
    icon: '🌐',
    description: 'Load files from GCS buckets into your pipeline.',
    fields: [
      { key: 'project_id', label: 'GCP Project ID', placeholder: 'my-gcp-project', envVar: 'GOOGLE_CLOUD_PROJECT' },
      { key: 'credentials_json', label: 'Service Account Key (JSON path)', placeholder: '/path/to/key.json', type: 'password', envVar: 'GOOGLE_APPLICATION_CREDENTIALS' },
      { key: 'default_bucket', label: 'Default Bucket (optional)', placeholder: 'my-gcs-bucket' },
    ],
    docsUrl: 'https://cloud.google.com/storage/docs/authentication',
    disabled: true,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function getVaultKeyForField(field: FieldDef): string | null {
  if (field.type !== 'password') return null
  return field.envVar ?? field.vaultKey ?? null
}

function buildDefaults(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {}
  for (const integration of INTEGRATIONS) {
    const defaults: Record<string, string> = {}
    for (const field of integration.fields) {
      if (field.defaultValue && field.type !== 'password') {
        defaults[field.key] = field.defaultValue
      }
    }
    if (Object.keys(defaults).length) out[integration.label] = defaults
  }
  return out
}

const STORAGE_KEY = 'conduitcraft:integrations'

function loadConfig(): Record<string, Record<string, string>> {
  const defaults = buildDefaults()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const merged: Record<string, Record<string, string>> = { ...defaults }
    for (const [label, vals] of Object.entries(saved)) {
      merged[label] = { ...(defaults[label] ?? {}), ...(vals as Record<string, string>) }
    }
    return merged
  } catch {
    return defaults
  }
}

function saveConfig(config: Record<string, Record<string, string>>) {
  // Strip password fields before saving to localStorage
  const clean: Record<string, Record<string, string>> = {}
  for (const [label, vals] of Object.entries(config)) {
    const integration = INTEGRATIONS.find((i) => i.label === label)
    if (!integration) { clean[label] = vals; continue }
    const stripped: Record<string, string> = {}
    for (const [k, v] of Object.entries(vals)) {
      const field = integration.fields.find((f) => f.key === k)
      if (!field || field.type !== 'password') stripped[k] = v
    }
    if (Object.keys(stripped).length) clean[label] = stripped
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

interface ConnectionStatus {
  status: 'idle' | 'testing' | 'ok' | 'error'
  message?: string
}

// ── CopyLine ───────────────────────────────────────────────────────────────

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="flex items-center gap-1.5 rounded border border-border bg-muted/40 px-2 py-1">
      <code className="flex-1 select-all font-mono text-[10px] text-muted-foreground">{text}</code>
      <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground" title="Copy">
        {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      </button>
    </div>
  )
}

function CopyHint({ text }: { text: string }) {
  const steps = text.split(' || ')
  if (steps.length === 1) return <div className="mt-1"><CopyLine text={text} /></div>

  const labels = [
    '1. Try with default service account:',
    '2. Or list available service accounts:',
  ]
  return (
    <div className="mt-1.5 space-y-1 rounded border border-border bg-muted/30 p-2">
      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Get a token</p>
      {steps.map((cmd, i) => (
        <div key={i}>
          {labels[i] && <p className="text-[9px] text-muted-foreground mb-0.5">{labels[i]}</p>}
          <CopyLine text={cmd.trim()} />
        </div>
      ))}
      <p className="text-[9px] text-muted-foreground mt-1">
        Replace <code className="font-mono">default</code> with the service account name from step 2 if step 1 fails.
      </p>
    </div>
  )
}

// ── VaultField — password fields stored in the Secrets Vault ──────────────

interface VaultFieldProps {
  field: FieldDef
  vaultKey: string
  vaultDir: string
  storedNames: string[]
  onStored: () => void
  disabled: boolean
}

function VaultField({ field, vaultKey, vaultDir, storedNames, onStored, disabled }: VaultFieldProps) {
  const isStored = storedNames.includes(vaultKey)
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${getApiBase()}/vault/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_dir: vaultDir, name: vaultKey, value: value.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setValue('')
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        onStored()
      } else {
        setError(data.detail ?? 'Failed to save')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <div className="mb-0.5 flex items-center gap-1.5">
        <label className="text-[11px] font-medium">{field.label}</label>
        <span className="rounded bg-purple-500/20 px-1 py-0 text-[9px] font-semibold text-purple-400 flex items-center gap-0.5">
          <KeyRound size={8} /> vault
        </span>
        {isStored && (
          <span className="flex items-center gap-0.5 rounded bg-green-500/20 px-1 py-0 text-[9px] font-medium text-green-400">
            <ShieldCheck size={8} /> stored as ${vaultKey}
          </span>
        )}
        {!isStored && (
          <span className="text-[9px] text-muted-foreground italic">not set</span>
        )}
      </div>

      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            className="h-7 w-full rounded-md border border-input bg-background px-2 pr-7 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={isStored ? '••••••••  (leave blank to keep current)' : field.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        </div>
        <Button
          size="sm"
          variant={saved ? 'default' : 'outline'}
          className={['h-7 text-xs', saved ? 'bg-green-600 text-white border-green-600' : ''].join(' ')}
          onClick={handleSave}
          disabled={saving || !value.trim()}
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : saved ? <Check size={10} /> : 'Save'}
        </Button>
      </div>

      {error && <p className="mt-0.5 text-[10px] text-red-400">{error}</p>}
      {!error && (
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          Encrypted in vault · used in generated code as{' '}
          <code className="font-mono">os.environ["{vaultKey}"]</code>
        </p>
      )}
      {field.hint && <CopyHint text={field.hint} />}
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function IntegrationsPanel() {
  const { projectFolder } = useProjectStore()
  const vaultDir = projectFolder ?? '~/.conduitcraft/vault'

  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>(loadConfig)
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [storedNames, setStoredNames] = useState<string[]>([])

  // Load vault secret names on mount and after any vault save
  const refreshVaultNames = async () => {
    try {
      const res = await fetch(`${getApiBase()}/vault/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vault_dir: vaultDir }),
      })
      if (res.ok) {
        const data = await res.json()
        setStoredNames(data.names ?? [])
      }
    } catch { /* backend may not be running */ }
  }

  useEffect(() => { refreshVaultNames() }, [vaultDir])

  const handleChange = (integrationLabel: string, key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [integrationLabel]: { ...(prev[integrationLabel] ?? {}), [key]: value },
    }))
  }

  const handleSave = (integration: IntegrationConfig) => {
    saveConfig(configs)
    setSaved((prev) => ({ ...prev, [integration.label]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [integration.label]: false })), 2000)
  }

  const handleTest = async (integration: IntegrationConfig) => {
    if (!integration.testEndpoint) return
    setStatuses((prev) => ({ ...prev, [integration.label]: { status: 'testing' } }))
    try {
      const cfg = configs[integration.label] ?? {}

      // For password fields, load value from vault
      const vaultSecrets: Record<string, string> = {}
      for (const field of integration.fields) {
        const vk = getVaultKeyForField(field)
        if (vk && storedNames.includes(vk)) {
          // We don't load the actual value here (vault list only gives names)
          // Instead we pass the vault reference; backend resolves via its own vault
          vaultSecrets[field.key] = `$${vk}`
        }
      }

      const mergedCfg = { ...cfg, ...vaultSecrets }
      const raw = integration.testParams ? integration.testParams(mergedCfg) : mergedCfg
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(raw).filter(([, v]) => v != null && v !== '')) as Record<string, string>
      ).toString()
      const url = `${getApiBase()}${integration.testEndpoint}${params ? `?${params}` : ''}`
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStatuses((prev) => ({ ...prev, [integration.label]: { status: 'ok', message: data.message ?? 'Connected' } }))
      } else {
        const msg = data.detail ?? data.message ?? JSON.stringify(data)
        setStatuses((prev) => ({ ...prev, [integration.label]: { status: 'error', message: String(msg).slice(0, 200) } }))
      }
    } catch (err) {
      setStatuses((prev) => ({ ...prev, [integration.label]: { status: 'error', message: String(err) } }))
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Integrations</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Non-sensitive settings saved in browser storage. API keys and tokens stored encrypted in the{' '}
          <span className="text-purple-400 font-medium">Secrets Vault</span>.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {INTEGRATIONS.map((integration) => {
            const cfg = configs[integration.label] ?? {}
            const status = statuses[integration.label]
            const isSaved = saved[integration.label]
            const isDisabled = integration.disabled

            // Check if integration has any non-password fields to show Save button
            const hasNonSecretFields = integration.fields.some((f) => f.type !== 'password')

            return (
              <div
                key={integration.label}
                className={['rounded-lg border bg-card p-4', isDisabled ? 'border-border/40 opacity-50 cursor-not-allowed select-none' : 'border-border'].join(' ')}
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={['text-xl leading-none', isDisabled ? 'grayscale' : ''].join(' ')}>{integration.icon}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold">{integration.label}</p>
                        {isDisabled && <span className="rounded bg-muted px-1 py-px text-[8px] text-muted-foreground font-medium">Coming soon</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isDisabled && status?.status === 'ok' && <Check size={13} className="text-green-400" />}
                    {!isDisabled && status?.status === 'error' && <X size={13} className="text-red-400" />}
                    {integration.docsUrl && (
                      <a href={integration.docsUrl} target="_blank" rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-2">
                  {integration.fields.map((field) => {
                    const vaultKey = getVaultKeyForField(field)

                    if (vaultKey) {
                      return (
                        <VaultField
                          key={field.key}
                          field={field}
                          vaultKey={vaultKey}
                          vaultDir={vaultDir}
                          storedNames={storedNames}
                          onStored={refreshVaultNames}
                          disabled={isDisabled ?? false}
                        />
                      )
                    }

                    return (
                      <div key={field.key}>
                        <label className="mb-0.5 block text-[11px] font-medium">
                          {field.label}
                          {field.envVar && (
                            <span className="ml-1 text-[9px] text-muted-foreground opacity-60">
                              env: {field.envVar}
                            </span>
                          )}
                        </label>
                        <Input
                          type={field.type ?? 'text'}
                          className="h-7 text-xs"
                          placeholder={field.placeholder}
                          value={cfg[field.key] ?? ''}
                          onChange={(e) => handleChange(integration.label, field.key, e.target.value)}
                        />
                        {field.hint && <CopyHint text={field.hint} />}
                      </div>
                    )
                  })}
                </div>

                {/* Status message */}
                {status?.message && (
                  <p className={`mt-2 text-[10px] ${status.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    {status.message}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-1.5">
                  {hasNonSecretFields && (
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleSave(integration)} disabled={isDisabled}>
                      {isSaved ? <><Check size={10} /> Saved</> : 'Save'}
                    </Button>
                  )}
                  {integration.testEndpoint && (
                    <Button
                      size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground"
                      onClick={() => handleTest(integration)}
                      disabled={isDisabled || status?.status === 'testing'}
                    >
                      {status?.status === 'testing'
                        ? <><Loader2 size={10} className="animate-spin" /> Testing…</>
                        : 'Test Connection'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
