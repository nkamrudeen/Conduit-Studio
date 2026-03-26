export { nodeRegistry } from './registry'

// Register all built-in nodes at import time
import { nodeRegistry } from './registry'
import { mlIngestNodes } from './ml/ingest'
import { mlTransformNodes } from './ml/transform'
import { mlTrainNodes } from './ml/train'
import { mlEvaluateNodes } from './ml/evaluate'
import { mlDeployNodes } from './ml/deploy'
import { mlMonitorNodes } from './ml/monitor'
import { llmIngestNodes } from './llm/ingest'
import { llmChunkNodes } from './llm/chunk'
import { llmEmbedNodes } from './llm/embed'
import { llmVectorStoreNodes } from './llm/vectorstore'
import { llmModelNodes } from './llm/llm'
import { llmChainNodes } from './llm/chain'
import { llmDeployNodes } from './llm/deploy'

nodeRegistry.registerAll([
  ...mlIngestNodes,
  ...mlTransformNodes,
  ...mlTrainNodes,
  ...mlEvaluateNodes,
  ...mlDeployNodes,
  ...mlMonitorNodes,
  ...llmIngestNodes,
  ...llmChunkNodes,
  ...llmEmbedNodes,
  ...llmVectorStoreNodes,
  ...llmModelNodes,
  ...llmChainNodes,
  ...llmDeployNodes,
])
