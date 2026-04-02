import type { PipelineDAG } from '@ai-ide/types'

export interface TemplateEntry {
  dag: PipelineDAG
  description: string
  tags: string[]
  complexity: 'Simple' | 'Intermediate' | 'Advanced'
  icon: string
}

// ─── ML TEMPLATES ────────────────────────────────────────────────────────────

const mlSklearnClassification: PipelineDAG = {
  id: 'tpl-ml-sklearn-classification',
  name: 'Sklearn Classification',
  pipeline: 'ml',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 200 }, config: { file_path: 'data.csv', separator: ',', header: 0 }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.missing_values', position: { x: 300, y: 200 }, config: { strategy: 'drop_rows' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.train_test_split', position: { x: 540, y: 200 }, config: { target_column: 'label', test_size: 0.2, random_state: 42, stratify: true }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.train.sklearn.random_forest', position: { x: 780, y: 200 }, config: { target_column: 'label', task: 'classification', n_estimators: 100, random_state: 42 }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.evaluate.classification', position: { x: 1020, y: 200 }, config: { target_column: 'label', output_report: true }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_train', target: 'n4', targetHandle: 'df_train' },
    { id: 'e4', source: 'n3', sourceHandle: 'df_test', target: 'n5', targetHandle: 'df_test' },
    { id: 'e5', source: 'n4', sourceHandle: 'model', target: 'n5', targetHandle: 'model' },
  ],
}

const mlXGBoostMLflow: PipelineDAG = {
  id: 'tpl-ml-xgboost-mlflow',
  name: 'XGBoost + MLflow Tracking',
  pipeline: 'ml',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 200 }, config: { file_path: 'data.csv', separator: ',', header: 0 }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.scaler', position: { x: 300, y: 200 }, config: { method: 'standard' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.train_test_split', position: { x: 540, y: 200 }, config: { target_column: 'target', test_size: 0.2, random_state: 0, stratify: false }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.train.sklearn.xgboost', position: { x: 780, y: 200 }, config: { target_column: 'target', task: 'regression', n_estimators: 200, learning_rate: 0.05, max_depth: 5 }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.evaluate.regression', position: { x: 1020, y: 200 }, config: { target_column: 'target', plot_residuals: true }, status: 'idle' },
    { id: 'n6', definitionId: 'ml.deploy.mlflow', position: { x: 1260, y: 200 }, config: { experiment_name: 'xgboost-run', model_name: 'xgb-model', mlflow_tracking_uri: 'http://localhost:5000' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_train', target: 'n4', targetHandle: 'df_train' },
    { id: 'e4', source: 'n3', sourceHandle: 'df_test', target: 'n5', targetHandle: 'df_test' },
    { id: 'e5', source: 'n4', sourceHandle: 'model', target: 'n5', targetHandle: 'model' },
    { id: 'e6', source: 'n4', sourceHandle: 'model', target: 'n6', targetHandle: 'model' },
    { id: 'e7', source: 'n5', sourceHandle: 'metrics', target: 'n6', targetHandle: 'metrics' },
  ],
}

const mlPyTorchTabular: PipelineDAG = {
  id: 'tpl-ml-pytorch-tabular',
  name: 'PyTorch Tabular',
  pipeline: 'ml',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'ml.ingest.csv', position: { x: 60, y: 200 }, config: { file_path: 'data.csv' }, status: 'idle' },
    { id: 'n2', definitionId: 'ml.transform.scaler', position: { x: 300, y: 200 }, config: { method: 'minmax' }, status: 'idle' },
    { id: 'n3', definitionId: 'ml.transform.train_test_split', position: { x: 540, y: 200 }, config: { target_column: 'target', test_size: 0.2, random_state: 42 }, status: 'idle' },
    { id: 'n4', definitionId: 'ml.train.pytorch', position: { x: 780, y: 200 }, config: { target_column: 'target', epochs: 50, lr: 0.001, batch_size: 32, hidden_layers: [128, 64] }, status: 'idle' },
    { id: 'n5', definitionId: 'ml.evaluate.regression', position: { x: 1020, y: 200 }, config: { target_column: 'target' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'df', target: 'n2', targetHandle: 'df_in' },
    { id: 'e2', source: 'n2', sourceHandle: 'df_out', target: 'n3', targetHandle: 'df_in' },
    { id: 'e3', source: 'n3', sourceHandle: 'df_train', target: 'n4', targetHandle: 'df_train' },
    { id: 'e4', source: 'n3', sourceHandle: 'df_test', target: 'n5', targetHandle: 'df_test' },
    { id: 'e5', source: 'n4', sourceHandle: 'model', target: 'n5', targetHandle: 'model' },
  ],
}

// ─── LLM TEMPLATES ───────────────────────────────────────────────────────────

const llmRagChroma: PipelineDAG = {
  id: 'tpl-llm-rag-chroma',
  name: 'RAG with Chroma',
  pipeline: 'llm',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.pdf', position: { x: 60, y: 200 }, config: { file_path: 'docs/', recursive: true }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.recursive', position: { x: 300, y: 200 }, config: { chunk_size: 1000, chunk_overlap: 200 }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.openai', position: { x: 540, y: 200 }, config: { model: 'text-embedding-3-small' }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.chroma', position: { x: 780, y: 200 }, config: { collection_name: 'docs', persist_directory: './chroma_db' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.openai', position: { x: 1020, y: 200 }, config: { model: 'gpt-4o-mini', temperature: 0.0 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { retriever_k: 5, prompt_template: 'Answer based on context:\n{context}\n\nQuestion: {question}' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
  ],
}

const llmRagFaiss: PipelineDAG = {
  id: 'tpl-llm-rag-faiss',
  name: 'RAG with FAISS',
  pipeline: 'llm',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.ingest.web', position: { x: 60, y: 200 }, config: { urls: ['https://docs.example.com'], max_depth: 1 }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chunk.markdown', position: { x: 300, y: 200 }, config: { chunk_size: 800, chunk_overlap: 100 }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.embed.huggingface', position: { x: 540, y: 200 }, config: { model: 'BAAI/bge-small-en-v1.5', device: 'cpu' }, status: 'idle' },
    { id: 'n4', definitionId: 'llm.vectorstore.faiss', position: { x: 780, y: 200 }, config: { index_type: 'Flat', metric: 'L2', save_local: './faiss_index' }, status: 'idle' },
    { id: 'n5', definitionId: 'llm.model.anthropic', position: { x: 1020, y: 200 }, config: { model: 'claude-sonnet-4-6', temperature: 0.2 }, status: 'idle' },
    { id: 'n6', definitionId: 'llm.chain.rag', position: { x: 1260, y: 200 }, config: { retriever_k: 4, prompt_template: 'Use the docs:\n{context}\n\nAnswer: {question}' }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'docs', target: 'n2', targetHandle: 'docs' },
    { id: 'e2', source: 'n2', sourceHandle: 'chunks', target: 'n3', targetHandle: 'chunks' },
    { id: 'e3', source: 'n3', sourceHandle: 'embeddings', target: 'n4', targetHandle: 'embeddings' },
    { id: 'e4', source: 'n4', sourceHandle: 'vectorstore', target: 'n5', targetHandle: 'vectorstore' },
    { id: 'e5', source: 'n4', sourceHandle: 'vectorstore', target: 'n6', targetHandle: 'vectorstore' },
    { id: 'e6', source: 'n5', sourceHandle: 'llm', target: 'n6', targetHandle: 'llm' },
  ],
}

const llmOllamaLocalChat: PipelineDAG = {
  id: 'tpl-llm-ollama-chat',
  name: 'Ollama Local Chat',
  pipeline: 'llm',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.model.ollama', position: { x: 60, y: 200 }, config: { model: 'llama3.2', base_url: 'http://localhost:11434', temperature: 0.7, system_prompt: 'You are a helpful assistant.' }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.deploy.langserve', position: { x: 300, y: 200 }, config: { host: '127.0.0.1', port: 8080, path: '/chat', enable_playground: true }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'llm', target: 'n2', targetHandle: 'chain' },
  ],
}

const llmReactAgent: PipelineDAG = {
  id: 'tpl-llm-react-agent',
  name: 'ReAct Agent with Tools',
  pipeline: 'llm',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  nodes: [
    { id: 'n1', definitionId: 'llm.model.openai', position: { x: 60, y: 200 }, config: { model: 'gpt-4o', temperature: 0.0, max_tokens: 4096 }, status: 'idle' },
    { id: 'n2', definitionId: 'llm.chain.react_agent', position: { x: 300, y: 200 }, config: { tools: ['web_search', 'calculator'], max_iterations: 10 }, status: 'idle' },
    { id: 'n3', definitionId: 'llm.deploy.fastapi', position: { x: 540, y: 200 }, config: { host: '0.0.0.0', port: 8000, cors_origins: ['*'] }, status: 'idle' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'llm', target: 'n2', targetHandle: 'llm' },
    { id: 'e2', source: 'n2', sourceHandle: 'agent', target: 'n3', targetHandle: 'chain' },
  ],
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const ML_TEMPLATES: TemplateEntry[] = [
  {
    dag: mlSklearnClassification,
    description: 'CSV → clean → split → Random Forest → evaluate. The classic starting point for tabular classification.',
    tags: ['sklearn', 'classification'],
    complexity: 'Simple',
    icon: '🌲',
  },
  {
    dag: mlXGBoostMLflow,
    description: 'XGBoost regression with StandardScaler preprocessing and MLflow experiment tracking built in.',
    tags: ['xgboost', 'mlflow', 'regression'],
    complexity: 'Intermediate',
    icon: '🚀',
  },
  {
    dag: mlPyTorchTabular,
    description: 'Feed-forward neural network on tabular data with MinMax scaling and PyTorch training loop.',
    tags: ['pytorch', 'neural-network'],
    complexity: 'Intermediate',
    icon: '🔥',
  },
]

export const LLM_TEMPLATES: TemplateEntry[] = [
  {
    dag: llmRagChroma,
    description: 'PDF docs → chunk → OpenAI embeddings → Chroma → GPT-4o-mini RAG chain. Ready to query your documents.',
    tags: ['rag', 'chroma', 'openai'],
    complexity: 'Intermediate',
    icon: '🔗',
  },
  {
    dag: llmRagFaiss,
    description: 'Web scraper → HuggingFace embeddings → FAISS → Claude RAG chain. Fully open-source embeddings.',
    tags: ['rag', 'faiss', 'claude', 'hf'],
    complexity: 'Intermediate',
    icon: '🦙',
  },
  {
    dag: llmOllamaLocalChat,
    description: 'Local Llama3.2 via Ollama served as a LangServe endpoint. No API keys, runs entirely on your machine.',
    tags: ['ollama', 'local', 'no-cloud'],
    complexity: 'Simple',
    icon: '🏠',
  },
  {
    dag: llmReactAgent,
    description: 'GPT-4o ReAct agent with web search + calculator tools, served via FastAPI.',
    tags: ['agent', 'tools', 'openai'],
    complexity: 'Advanced',
    icon: '🤖',
  },
]
