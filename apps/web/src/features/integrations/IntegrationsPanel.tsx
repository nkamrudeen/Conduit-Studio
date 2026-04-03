import React, { useState } from 'react'
import { Check, Copy, X, Loader2, ExternalLink } from 'lucide-react'
import { Button, Input, ScrollArea } from '@ai-ide/ui'
import { getApiBase } from '../../lib/api'

interface FieldDef {
  key: string
  label: string
  placeholder: string
  defaultValue?: string   // pre-filled; user can override
  hint?: string           // copyable command / note shown below the input
  type?: 'text' | 'password' | 'url'
  envVar?: string
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
      { key: 'credentials_json', label: 'Service Account Key (JSON path)', placeholder: '/path/to/key.json', envVar: 'GOOGLE_APPLICATION_CREDENTIALS' },
      { key: 'default_bucket', label: 'Default Bucket (optional)', placeholder: 'my-gcs-bucket' },
    ],
    docsUrl: 'https://cloud.google.com/storage/docs/authentication',
    disabled: true,
  },
]

// Build initial defaults from field definitions
function buildDefaults(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {}
  for (const integration of INTEGRATIONS) {
    const defaults: Record<string, string> = {}
    for (const field of integration.fields) {
      if (field.defaultValue) defaults[field.key] = field.defaultValue
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
    // Merge: saved values win over defaults, but defaults fill in missing keys
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

interface ConnectionStatus {
  status: 'idle' | 'testing' | 'ok' | 'error'
  message?: string
}

// Copyable command line
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

// Multi-step hint block — shows labelled copyable commands
function CopyHint({ text }: { text: string }) {
  // If text contains " || " treat as multi-step hints separated by that delimiter
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

export function IntegrationsPanel() {
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>(loadConfig)
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

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
      const raw = integration.testParams ? integration.testParams(cfg) : cfg
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
          Credentials are stored in localStorage. For production use, configure via environment variables.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {INTEGRATIONS.map((integration) => {
            const cfg = configs[integration.label] ?? {}
            const status = statuses[integration.label]
            const isSaved = saved[integration.label]
            const isDisabled = integration.disabled

            return (
              <div key={integration.label} className={['rounded-lg border bg-card p-4', isDisabled ? 'border-border/40 opacity-50 cursor-not-allowed select-none' : 'border-border'].join(' ')}>
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
                  {integration.fields.map((field) => (
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
                  ))}
                </div>

                {/* Status message */}
                {status?.message && (
                  <p className={`mt-2 text-[10px] ${status.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    {status.message}
                  </p>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleSave(integration)} disabled={isDisabled}>
                    {isSaved ? <><Check size={10} /> Saved</> : 'Save'}
                  </Button>
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
