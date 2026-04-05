import type { NodeDefinition } from '@ai-ide/types'

export const llmSplitNodes: NodeDefinition[] = [
  {
    id: 'llm.split.ab',
    category: 'split',
    pipeline: 'llm',
    label: 'A/B Split',
    description: 'Fork LLM pipeline into two parallel branches for prompt/model comparison',
    icon: '🔀',
    color: '#8b5cf6',
    inputs: [{ id: 'docs', label: 'Documents', type: 'Text' }],
    outputs: [
      { id: 'branch_a', label: 'Branch A', type: 'Text' },
      { id: 'branch_b', label: 'Branch B', type: 'Text' },
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
          enum: ['random', 'first_n'],
          default: 'random',
        },
        random_seed: {
          type: 'integer',
          title: 'Random Seed',
          default: 42,
        },
        branch_a_label: {
          type: 'string',
          title: 'Branch A Label',
          default: 'baseline',
        },
        branch_b_label: {
          type: 'string',
          title: 'Branch B Label',
          default: 'experiment',
        },
      },
    },
    codeTemplateId: 'llm/split_ab',
    requiredPackages: ['langchain-core'],
  },
]
