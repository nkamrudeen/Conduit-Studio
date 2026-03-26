import type { NodeDefinition } from '@ai-ide/types'

export const mlEvaluateNodes: NodeDefinition[] = [
  {
    id: 'ml.evaluate.classification',
    category: 'evaluate',
    pipeline: 'ml',
    label: 'Classification Report',
    description: 'Accuracy, precision, recall, F1, confusion matrix',
    icon: '📋',
    color: '#a855f7',
    inputs: [
      { id: 'model', label: 'Model', type: 'Model' },
      { id: 'df_test', label: 'Test DataFrame', type: 'DataFrame' },
    ],
    outputs: [{ id: 'metrics', label: 'Metrics', type: 'Metrics' }],
    configSchema: {
      type: 'object',
      required: ['target_column'],
      properties: {
        target_column: { type: 'string', title: 'Target Column' },
        output_report: { type: 'boolean', title: 'Print full classification report', default: true },
        plot_confusion_matrix: { type: 'boolean', title: 'Plot Confusion Matrix', default: true },
      },
    },
    codeTemplateId: 'ml/evaluate_classification',
    requiredPackages: ['scikit-learn', 'matplotlib', 'seaborn'],
  },
  {
    id: 'ml.evaluate.regression',
    category: 'evaluate',
    pipeline: 'ml',
    label: 'Regression Metrics',
    description: 'MAE, MSE, RMSE, R² score',
    icon: '📉',
    color: '#a855f7',
    inputs: [
      { id: 'model', label: 'Model', type: 'Model' },
      { id: 'df_test', label: 'Test DataFrame', type: 'DataFrame' },
    ],
    outputs: [{ id: 'metrics', label: 'Metrics', type: 'Metrics' }],
    configSchema: {
      type: 'object',
      required: ['target_column'],
      properties: {
        target_column: { type: 'string', title: 'Target Column' },
        plot_residuals: { type: 'boolean', title: 'Plot Residuals', default: true },
      },
    },
    codeTemplateId: 'ml/evaluate_regression',
    requiredPackages: ['scikit-learn', 'matplotlib'],
  },
  {
    id: 'ml.evaluate.cross_validation',
    category: 'evaluate',
    pipeline: 'ml',
    label: 'Cross Validation',
    description: 'k-Fold cross-validation scoring',
    icon: '🔄',
    color: '#a855f7',
    inputs: [
      { id: 'model', label: 'Model', type: 'Model' },
      { id: 'df_in', label: 'DataFrame', type: 'DataFrame' },
    ],
    outputs: [{ id: 'metrics', label: 'Metrics', type: 'Metrics' }],
    configSchema: {
      type: 'object',
      required: ['target_column'],
      properties: {
        target_column: { type: 'string', title: 'Target Column' },
        cv: { type: 'integer', title: 'Number of Folds', default: 5 },
        scoring: { type: 'string', title: 'Scoring Metric', default: 'accuracy' },
      },
    },
    codeTemplateId: 'ml/evaluate_cross_validation',
    requiredPackages: ['scikit-learn'],
  },
]
