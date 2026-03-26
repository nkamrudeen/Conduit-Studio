import type { NodeDefinition } from '@ai-ide/types'

export const llmEmbedNodes: NodeDefinition[] = [
  {
    id: 'llm.embed.openai',
    category: 'embed',
    pipeline: 'llm',
    label: 'OpenAI Embeddings',
    description: 'Embed text using OpenAI text-embedding-3 models',
    icon: '🔢',
    color: '#10b981',
    inputs: [{ id: 'chunks', label: 'Chunks', type: 'Text' }],
    outputs: [{ id: 'embeddings', label: 'Embeddings', type: 'Embeddings' }],
    configSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', title: 'Model', enum: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'], default: 'text-embedding-3-small' },
        api_key_env: { type: 'string', title: 'API Key Env Var', default: 'OPENAI_API_KEY' },
        batch_size: { type: 'integer', title: 'Batch Size', default: 100 },
      },
    },
    codeTemplateId: 'llm/embed_openai',
    requiredPackages: ['langchain-openai'],
  },
  {
    id: 'llm.embed.huggingface',
    category: 'embed',
    pipeline: 'llm',
    label: 'HuggingFace Embeddings',
    description: 'Embed text using a local HuggingFace sentence-transformer model',
    icon: '🤗',
    color: '#10b981',
    inputs: [{ id: 'chunks', label: 'Chunks', type: 'Text' }],
    outputs: [{ id: 'embeddings', label: 'Embeddings', type: 'Embeddings' }],
    configSchema: {
      type: 'object',
      properties: {
        model_name: { type: 'string', title: 'Model Name', default: 'sentence-transformers/all-MiniLM-L6-v2' },
        device: { type: 'string', title: 'Device', enum: ['cpu', 'cuda', 'mps'], default: 'cpu' },
      },
    },
    codeTemplateId: 'llm/embed_huggingface',
    requiredPackages: ['langchain-huggingface', 'sentence-transformers'],
  },
  {
    id: 'llm.embed.ollama',
    category: 'embed',
    pipeline: 'llm',
    label: 'Ollama Embeddings',
    description: 'Embed text using a local Ollama model',
    icon: '🦙',
    color: '#10b981',
    inputs: [{ id: 'chunks', label: 'Chunks', type: 'Text' }],
    outputs: [{ id: 'embeddings', label: 'Embeddings', type: 'Embeddings' }],
    configSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', title: 'Ollama Model', default: 'nomic-embed-text' },
        base_url: { type: 'string', title: 'Ollama Base URL', default: 'http://localhost:11434' },
      },
    },
    codeTemplateId: 'llm/embed_ollama',
    requiredPackages: ['langchain-ollama'],
  },
]
