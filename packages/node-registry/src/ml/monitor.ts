import type { NodeDefinition } from '@ai-ide/types'

export const mlMonitorNodes: NodeDefinition[] = [
  {
    id: 'ml.monitor.evidently_drift',
    category: 'monitor',
    pipeline: 'ml',
    label: 'Data Drift (Evidently)',
    description: 'Detect data drift between reference and current datasets',
    icon: '📡',
    color: '#64748b',
    inputs: [
      { id: 'df_reference', label: 'Reference DataFrame', type: 'DataFrame' },
      { id: 'df_current', label: 'Current DataFrame', type: 'DataFrame' },
    ],
    outputs: [{ id: 'metrics', label: 'Drift Metrics', type: 'Metrics' }],
    configSchema: {
      type: 'object',
      properties: {
        report_path: { type: 'string', title: 'Report Output Path', default: 'drift_report.html' },
        drift_share_threshold: { type: 'number', title: 'Drift Share Threshold', default: 0.15 },
        columns: { type: 'array', items: { type: 'string' }, title: 'Columns to check (empty=all)' },
      },
    },
    codeTemplateId: 'ml/monitor_evidently_drift',
    requiredPackages: ['evidently'],
  },
  {
    id: 'ml.monitor.model_performance',
    category: 'monitor',
    pipeline: 'ml',
    label: 'Model Performance Monitor',
    description: 'Track model performance metrics over time',
    icon: '📈',
    color: '#64748b',
    inputs: [
      { id: 'model', label: 'Model', type: 'Model' },
      { id: 'df_current', label: 'Current DataFrame', type: 'DataFrame' },
    ],
    outputs: [{ id: 'metrics', label: 'Performance Metrics', type: 'Metrics' }],
    configSchema: {
      type: 'object',
      required: ['target_column'],
      properties: {
        target_column: { type: 'string', title: 'Target Column' },
        metrics: {
          type: 'array',
          items: { type: 'string', enum: ['accuracy', 'f1', 'precision', 'recall', 'rmse', 'mae'] },
          title: 'Metrics to track',
          default: ['accuracy', 'f1'],
        },
        alert_threshold: { type: 'number', title: 'Alert if metric drops below', default: 0.8 },
        alert_webhook: { type: 'string', title: 'Alert Webhook URL (optional)' },
      },
    },
    codeTemplateId: 'ml/monitor_model_performance',
    requiredPackages: ['scikit-learn', 'evidently'],
  },
]
