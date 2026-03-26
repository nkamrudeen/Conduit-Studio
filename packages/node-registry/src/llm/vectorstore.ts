import type { NodeDefinition } from '@ai-ide/types'

export const llmVectorStoreNodes: NodeDefinition[] = [
  {
    id: 'llm.vectorstore.chroma',
    category: 'vectorstore',
    pipeline: 'llm',
    label: 'Chroma',
    description: 'Store and retrieve embeddings in ChromaDB',
    icon: '🎨',
    color: '#f59e0b',
    inputs: [{ id: 'embeddings', label: 'Embeddings', type: 'Embeddings' }],
    outputs: [{ id: 'vectorstore', label: 'Vector Store', type: 'VectorStore' }],
    configSchema: {
      type: 'object',
      properties: {
        collection_name: { type: 'string', title: 'Collection Name', default: 'ai_ide_collection' },
        persist_directory: { type: 'string', title: 'Persist Directory', default: './chroma_db' },
      },
    },
    codeTemplateId: 'llm/vectorstore_chroma',
    requiredPackages: ['langchain-chroma', 'chromadb'],
  },
  {
    id: 'llm.vectorstore.faiss',
    category: 'vectorstore',
    pipeline: 'llm',
    label: 'FAISS',
    description: 'In-memory / local FAISS vector store',
    icon: '🔍',
    color: '#f59e0b',
    inputs: [{ id: 'embeddings', label: 'Embeddings', type: 'Embeddings' }],
    outputs: [{ id: 'vectorstore', label: 'Vector Store', type: 'VectorStore' }],
    configSchema: {
      type: 'object',
      properties: {
        save_path: { type: 'string', title: 'Save Path (optional)', default: './faiss_index' },
        index_type: { type: 'string', title: 'Index Type', enum: ['Flat', 'IVF', 'HNSW'], default: 'Flat' },
      },
    },
    codeTemplateId: 'llm/vectorstore_faiss',
    requiredPackages: ['langchain-community', 'faiss-cpu'],
  },
  {
    id: 'llm.vectorstore.pinecone',
    category: 'vectorstore',
    pipeline: 'llm',
    label: 'Pinecone',
    description: 'Managed vector store via Pinecone',
    icon: '🌲',
    color: '#f59e0b',
    inputs: [{ id: 'embeddings', label: 'Embeddings', type: 'Embeddings' }],
    outputs: [{ id: 'vectorstore', label: 'Vector Store', type: 'VectorStore' }],
    configSchema: {
      type: 'object',
      required: ['index_name'],
      properties: {
        index_name: { type: 'string', title: 'Index Name' },
        api_key_env: { type: 'string', title: 'Pinecone API Key Env Var', default: 'PINECONE_API_KEY' },
        environment: { type: 'string', title: 'Environment (legacy)', default: 'gcp-starter' },
      },
    },
    codeTemplateId: 'llm/vectorstore_pinecone',
    requiredPackages: ['langchain-pinecone', 'pinecone-client'],
  },
]
