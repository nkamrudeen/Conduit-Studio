import type { NodeDefinition } from '@ai-ide/types'

export const mlSplitNodes: NodeDefinition[] = [
  {
    id: 'ml.split.ab',
    category: 'split',
    pipeline: 'ml',
    label: 'A/B Split',
    description: 'Fork pipeline execution into two parallel branches for comparison',
    icon: '🔀',
    color: '#8b5cf6',
    inputs: [{ id: 'df', label: 'DataFrame', type: 'DataFrame' }],
    outputs: [
      { id: 'branch_a', label: 'Branch A', type: 'DataFrame' },
      { id: 'branch_b', label: 'Branch B', type: 'DataFrame' },
    ],
    configSchema: {
      type: 'object',
      properties: {
        split_ratio: {
          type: 'number',
          title: 'Branch A ratio (0–1)',
          default: 0.5,
          minimum: 0.1,
          maximum: 0.9,
        },
        strategy: {
          type: 'string',
          title: 'Split Strategy',
          enum: ['random', 'first_n', 'stratified'],
          default: 'random',
        },
        stratify_col: {
          type: 'string',
          title: 'Stratify Column (if stratified)',
        },
        random_seed: {
          type: 'integer',
          title: 'Random Seed',
          default: 42,
        },
      },
    },
    codeTemplateId: 'ml/split_ab',
    requiredPackages: ['pandas', 'scikit-learn'],
  },
]
