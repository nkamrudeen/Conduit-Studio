import type { NodeDefinition } from '@ai-ide/types'

const modelIn = { id: 'model', label: 'Trained Model', type: 'Model' } as const

export const mlDeployNodes: NodeDefinition[] = [
  {
    id: 'ml.deploy.mlflow',
    category: 'deploy',
    pipeline: 'ml',
    label: 'MLflow Registry',
    description: 'Log and register the model to MLflow',
    icon: '📦',
    color: '#06b6d4',
    inputs: [modelIn, { id: 'metrics', label: 'Metrics', type: 'Metrics' }],
    outputs: [],
    configSchema: {
      type: 'object',
      required: ['experiment_name', 'model_name'],
      properties: {
        experiment_name: { type: 'string', title: 'Experiment Name' },
        model_name: { type: 'string', title: 'Registered Model Name' },
        mlflow_tracking_uri: { type: 'string', title: 'MLflow Tracking URI', default: 'http://localhost:5000' },
        tags: { type: 'object', title: 'Tags (key-value)', additionalProperties: { type: 'string' } },
      },
    },
    codeTemplateId: 'ml/deploy_mlflow',
    requiredPackages: ['mlflow'],
  },
  {
    id: 'ml.deploy.fastapi',
    category: 'deploy',
    pipeline: 'ml',
    label: 'FastAPI Endpoint',
    description: 'Generate a FastAPI serving endpoint for the model',
    icon: '🌐',
    color: '#06b6d4',
    inputs: [modelIn],
    outputs: [],
    configSchema: {
      type: 'object',
      required: ['model_path'],
      properties: {
        model_path: { type: 'string', title: 'Model Save Path', default: 'model.pkl' },
        host: { type: 'string', title: 'Host', default: '0.0.0.0' },
        port: { type: 'integer', title: 'Port', default: 8080 },
        route_prefix: { type: 'string', title: 'Route Prefix', default: '/predict' },
      },
    },
    codeTemplateId: 'ml/deploy_fastapi',
    requiredPackages: ['fastapi', 'uvicorn', 'joblib'],
  },
  {
    id: 'ml.deploy.huggingface_hub',
    category: 'deploy',
    pipeline: 'ml',
    label: 'HuggingFace Hub Push',
    description: 'Push the model to the HuggingFace Hub',
    icon: '🤗',
    color: '#ff9d00',
    inputs: [modelIn],
    outputs: [],
    configSchema: {
      type: 'object',
      required: ['repo_id'],
      properties: {
        repo_id: { type: 'string', title: 'Repository ID', description: 'username/model-name' },
        token_env: { type: 'string', title: 'HF Token Env Var', default: 'HF_TOKEN' },
        private: { type: 'boolean', title: 'Private Repository', default: false },
      },
    },
    codeTemplateId: 'ml/deploy_huggingface_hub',
    requiredPackages: ['huggingface_hub'],
  },
]
