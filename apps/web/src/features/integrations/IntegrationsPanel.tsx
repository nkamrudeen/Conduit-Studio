import React, { useState } from 'react'
import { Check, X, Loader2, ExternalLink } from 'lucide-react'
import { Button, Input, ScrollArea } from '@ai-ide/ui'

interface IntegrationConfig {
  label: string
  icon: string
  description: string
  fields: {
    key: string
    label: string
    placeholder: string
    type?: 'text' | 'password' | 'url'
    envVar?: string
  }[]
  testEndpoint?: string
  docsUrl?: string
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    label: 'MLflow',
    icon: '📊',
    description: 'Experiment tracking, model registry and artifact logging.',
    fields: [
      { key: 'tracking_uri', label: 'Tracking URI', placeholder: 'http://localhost:5000', type: 'url' },
      { key: 'experiment_name', label: 'Default Experiment Name', placeholder: 'my_experiment' },
      { key: 'artifact_root', label: 'Artifact Root (optional)', placeholder: 'mlflow-artifacts:/' },
    ],
    testEndpoint: '/api/mlflow/experiments',
    docsUrl: 'https://mlflow.org/docs/latest/tracking.html',
  },
  {
    label: 'Kubeflow Pipelines',
    icon: '☸️',
    description: 'Submit and monitor ML pipelines on Kubernetes.',
    fields: [
      { key: 'host', label: 'Kubeflow Host', placeholder: 'http://localhost:8080', type: 'url' },
      { key: 'namespace', label: 'Namespace', placeholder: 'kubeflow' },
      { key: 'token', label: 'Bearer Token (if auth enabled)', placeholder: 'kubectl -n kubeflow create token default-editor', type: 'password' },
    ],
    testEndpoint: '/api/kubeflow/pipelines',
    docsUrl: 'https://www.kubeflow.org/docs/components/pipelines/',
  },
  {
    label: 'HuggingFace Hub',
    icon: '🤗',
    description: 'Download models, push to Hub, and use the Inference API.',
    fields: [
      { key: 'token', label: 'Access Token', placeholder: 'hf_...', type: 'password', envVar: 'HF_TOKEN' },
      { key: 'username', label: 'Username (for repo_id prefix)', placeholder: 'your-hf-username' },
      { key: 'cache_dir', label: 'Local Cache Dir (optional)', placeholder: '~/.cache/huggingface' },
    ],
    docsUrl: 'https://huggingface.co/docs/hub/security-tokens',
  },
  {
    label: 'OpenAI',
    icon: '🧠',
    description: 'GPT-4, embeddings, and other OpenAI APIs.',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'password', envVar: 'OPENAI_API_KEY' },
      { key: 'base_url', label: 'Base URL (optional)', placeholder: 'https://api.openai.com/v1', type: 'url' },
      { key: 'org_id', label: 'Organization ID (optional)', placeholder: 'org-...' },
    ],
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    label: 'Anthropic',
    icon: '⚡',
    description: 'Claude models via the Anthropic API.',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'sk-ant-...', type: 'password', envVar: 'ANTHROPIC_API_KEY' },
    ],
    docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
  },
  {
    label: 'AWS S3',
    icon: '🪣',
    description: 'S3 bucket access for data ingestion and artifact storage.',
    fields: [
      { key: 'aws_access_key_id', label: 'Access Key ID', placeholder: 'AKIA...', type: 'password', envVar: 'AWS_ACCESS_KEY_ID' },
      { key: 'aws_secret_access_key', label: 'Secret Access Key', placeholder: '...', type: 'password', envVar: 'AWS_SECRET_ACCESS_KEY' },
      { key: 'aws_region', label: 'Default Region', placeholder: 'us-east-1' },
      { key: 'default_bucket', label: 'Default Bucket (optional)', placeholder: 'my-ml-bucket' },
    ],
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
  },
]

const STORAGE_KEY = 'aiide:integrations'

function loadConfig(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveConfig(config: Record<string, Record<string, string>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

interface ConnectionStatus {
  status: 'idle' | 'testing' | 'ok' | 'error'
  message?: string
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
      const config = configs[integration.label] ?? {}
      const params = new URLSearchParams(config).toString()
      const res = await fetch(`${integration.testEndpoint}?${params}`)
      if (res.ok) {
        setStatuses((prev) => ({ ...prev, [integration.label]: { status: 'ok', message: 'Connected' } }))
      } else {
        const text = await res.text()
        setStatuses((prev) => ({ ...prev, [integration.label]: { status: 'error', message: text.slice(0, 120) } }))
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

            return (
              <div
                key={integration.label}
                className="rounded-lg border border-border bg-card p-4"
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{integration.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{integration.label}</p>
                      <p className="text-[10px] text-muted-foreground">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {status?.status === 'ok' && <Check size={13} className="text-green-400" />}
                    {status?.status === 'error' && <X size={13} className="text-red-400" />}
                    {integration.docsUrl && (
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleSave(integration)}
                  >
                    {isSaved ? <><Check size={10} /> Saved</> : 'Save'}
                  </Button>
                  {integration.testEndpoint && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-muted-foreground"
                      onClick={() => handleTest(integration)}
                      disabled={status?.status === 'testing'}
                    >
                      {status?.status === 'testing' ? (
                        <><Loader2 size={10} className="animate-spin" /> Testing…</>
                      ) : 'Test Connection'}
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
