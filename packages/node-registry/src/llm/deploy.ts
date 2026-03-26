import type { NodeDefinition } from '@ai-ide/types'

export const llmDeployNodes: NodeDefinition[] = [
  {
    id: 'llm.deploy.langserve',
    category: 'deploy',
    pipeline: 'llm',
    label: 'LangServe',
    description: 'Deploy chain as a REST API via LangServe',
    icon: '🚀',
    color: '#06b6d4',
    inputs: [{ id: 'chain', label: 'Chain / Agent', type: 'Any' }],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        route: { type: 'string', title: 'API Route', default: '/chain' },
        host: { type: 'string', title: 'Host', default: '0.0.0.0' },
        port: { type: 'integer', title: 'Port', default: 8080 },
      },
    },
    codeTemplateId: 'llm/deploy_langserve',
    requiredPackages: ['langserve', 'fastapi', 'uvicorn'],
  },
  {
    id: 'llm.deploy.fastapi',
    category: 'deploy',
    pipeline: 'llm',
    label: 'FastAPI Endpoint',
    description: 'Wrap chain in a custom FastAPI endpoint',
    icon: '🌐',
    color: '#06b6d4',
    inputs: [{ id: 'chain', label: 'Chain / Agent', type: 'Any' }],
    outputs: [],
    configSchema: {
      type: 'object',
      properties: {
        route: { type: 'string', title: 'Route', default: '/ask' },
        host: { type: 'string', title: 'Host', default: '0.0.0.0' },
        port: { type: 'integer', title: 'Port', default: 8080 },
        enable_streaming: { type: 'boolean', title: 'Enable Streaming (SSE)', default: true },
      },
    },
    codeTemplateId: 'llm/deploy_fastapi',
    requiredPackages: ['fastapi', 'uvicorn', 'sse-starlette'],
  },
  {
    id: 'llm.monitor.usage',
    category: 'monitor',
    pipeline: 'llm',
    label: 'LLM Usage Monitor',
    description: 'Track token usage, latency, and cost',
    icon: '📊',
    color: '#64748b',
    inputs: [{ id: 'chain', label: 'Chain', type: 'Any' }],
    outputs: [{ id: 'metrics', label: 'Metrics', type: 'Metrics' }],
    configSchema: {
      type: 'object',
      properties: {
        track_cost: { type: 'boolean', title: 'Track Cost', default: true },
        log_to_langsmith: { type: 'boolean', title: 'Log to LangSmith', default: false },
        langsmith_api_key_env: { type: 'string', title: 'LangSmith API Key Env Var', default: 'LANGCHAIN_API_KEY' },
        alert_cost_threshold_usd: { type: 'number', title: 'Alert cost threshold (USD/day)', default: 10 },
      },
    },
    codeTemplateId: 'llm/monitor_usage',
    requiredPackages: ['langchain', 'langsmith'],
  },
]
