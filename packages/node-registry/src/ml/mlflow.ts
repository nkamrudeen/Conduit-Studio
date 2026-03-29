import type { NodeDefinition } from '@ai-ide/types'

const runIn = { id: 'run', label: 'Run Context', type: 'Any' } as const
const runOut = { id: 'run', label: 'Run Context', type: 'Any' } as const
const metricsIn = { id: 'metrics', label: 'Metrics', type: 'Metrics' } as const

export const mlMlflowNodes: NodeDefinition[] = [
  {
    id: 'ml.mlflow.set_experiment',
    category: 'experiment',
    pipeline: 'ml',
    label: 'MLflow Set Experiment',
    description: 'Create or set an MLflow experiment and start a new run',
    icon: '🧪',
    color: '#0ea5e9',
    inputs: [],
    outputs: [runOut],
    configSchema: {
      type: 'object',
      required: ['experiment_name'],
      properties: {
        experiment_name: { type: 'string', title: 'Experiment Name', default: 'my_experiment' },
        run_name: { type: 'string', title: 'Run Name (optional)' },
        tracking_uri: { type: 'string', title: 'Tracking URI', default: 'http://localhost:5000' },
        tags: {
          type: 'object',
          title: 'Tags',
          additionalProperties: { type: 'string' },
        },
      },
    },
    codeTemplateId: 'ml/mlflow_set_experiment',
    requiredPackages: ['mlflow'],
  },
  {
    id: 'ml.mlflow.autolog',
    category: 'experiment',
    pipeline: 'ml',
    label: 'MLflow Autolog',
    description: 'Enable MLflow autologging for a specific ML framework',
    icon: '📡',
    color: '#0ea5e9',
    inputs: [runIn],
    outputs: [runOut],
    configSchema: {
      type: 'object',
      required: ['framework'],
      properties: {
        framework: {
          type: 'string',
          title: 'Framework',
          enum: ['sklearn', 'xgboost', 'keras', 'pytorch'],
          default: 'sklearn',
        },
        log_input_examples: { type: 'boolean', title: 'Log Input Examples', default: false },
        log_model_signatures: { type: 'boolean', title: 'Log Model Signatures', default: true },
        log_models: { type: 'boolean', title: 'Log Models', default: true },
      },
    },
    codeTemplateId: 'ml/mlflow_autolog',
    requiredPackages: ['mlflow'],
  },
  {
    id: 'ml.mlflow.log_params',
    category: 'experiment',
    pipeline: 'ml',
    label: 'MLflow Log Params',
    description: 'Explicitly log hyperparameters, metrics, and artifacts to the active run',
    icon: '📝',
    color: '#0ea5e9',
    inputs: [runIn, metricsIn],
    outputs: [runOut],
    configSchema: {
      type: 'object',
      properties: {
        params: {
          type: 'object',
          title: 'Parameters (key-value)',
          additionalProperties: { type: 'string' },
        },
        artifacts: {
          type: 'array',
          title: 'Artifact Paths',
          items: { type: 'string' },
        },
      },
    },
    codeTemplateId: 'ml/mlflow_log_params',
    requiredPackages: ['mlflow'],
  },
  {
    id: 'ml.mlflow.compare_runs',
    category: 'experiment',
    pipeline: 'ml',
    label: 'MLflow Compare Runs',
    description: 'Fetch and compare all runs in an experiment, output as DataFrame',
    icon: '📊',
    color: '#0ea5e9',
    inputs: [],
    outputs: [{ id: 'df', label: 'Runs DataFrame', type: 'DataFrame' }],
    configSchema: {
      type: 'object',
      required: ['experiment_name'],
      properties: {
        experiment_name: { type: 'string', title: 'Experiment Name', default: 'my_experiment' },
        tracking_uri: { type: 'string', title: 'Tracking URI', default: 'http://localhost:5000' },
        sort_metric: { type: 'string', title: 'Sort by Metric', default: 'accuracy' },
        max_results: { type: 'integer', title: 'Max Runs', default: 10 },
      },
    },
    codeTemplateId: 'ml/mlflow_compare_runs',
    requiredPackages: ['mlflow', 'pandas'],
  },
  {
    id: 'ml.mlflow.load_model',
    category: 'experiment',
    pipeline: 'ml',
    label: 'MLflow Load Model',
    description: 'Load a registered model version from the MLflow Model Registry',
    icon: '📥',
    color: '#0ea5e9',
    inputs: [],
    outputs: [{ id: 'model', label: 'Loaded Model', type: 'Model' }],
    configSchema: {
      type: 'object',
      required: ['model_name'],
      properties: {
        model_name: { type: 'string', title: 'Registered Model Name', default: 'my_model' },
        model_version: {
          type: 'string',
          title: 'Version / Stage',
          enum: ['Production', 'Staging', 'Latest', '1', '2', '3'],
          default: 'Production',
        },
        tracking_uri: { type: 'string', title: 'Tracking URI', default: 'http://localhost:5000' },
      },
    },
    codeTemplateId: 'ml/mlflow_load_model',
    requiredPackages: ['mlflow'],
  },
]
