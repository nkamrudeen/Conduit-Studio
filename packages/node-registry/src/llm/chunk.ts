import type { NodeDefinition } from '@ai-ide/types'

export const llmChunkNodes: NodeDefinition[] = [
  {
    id: 'llm.chunk.recursive',
    category: 'chunk',
    pipeline: 'llm',
    label: 'Recursive Text Splitter',
    description: 'Split documents into chunks recursively',
    icon: '✂️',
    color: '#8b5cf6',
    inputs: [{ id: 'docs', label: 'Documents', type: 'Text' }],
    outputs: [{ id: 'chunks', label: 'Chunks', type: 'Text' }],
    configSchema: {
      type: 'object',
      properties: {
        chunk_size: { type: 'integer', title: 'Chunk Size (chars)', default: 1000 },
        chunk_overlap: { type: 'integer', title: 'Chunk Overlap (chars)', default: 200 },
      },
    },
    codeTemplateId: 'llm/chunk_recursive',
    requiredPackages: ['langchain'],
  },
  {
    id: 'llm.chunk.markdown',
    category: 'chunk',
    pipeline: 'llm',
    label: 'Markdown Splitter',
    description: 'Split markdown documents by headers',
    icon: '📝',
    color: '#8b5cf6',
    inputs: [{ id: 'docs', label: 'Documents', type: 'Text' }],
    outputs: [{ id: 'chunks', label: 'Chunks', type: 'Text' }],
    configSchema: {
      type: 'object',
      properties: {
        headers_to_split_on: {
          type: 'array',
          title: 'Headers to split on',
          items: { type: 'string' },
          default: ['#', '##', '###'],
        },
        strip_headers: { type: 'boolean', title: 'Strip headers from content', default: false },
      },
    },
    codeTemplateId: 'llm/chunk_markdown',
    requiredPackages: ['langchain'],
  },
]
