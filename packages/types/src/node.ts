import type { JSONSchema7 } from 'json-schema'

export type PortType =
  | 'DataFrame'
  | 'Model'
  | 'Embeddings'
  | 'VectorStore'
  | 'Text'
  | 'Metrics'
  | 'Any'

export type NodeCategory =
  | 'ingest'
  | 'extract'
  | 'transform'
  | 'filter'
  | 'split'
  | 'train'
  | 'evaluate'
  | 'deploy'
  | 'monitor'
  | 'experiment'
  | 'finetune'
  | 'chunk'
  | 'embed'
  | 'vectorstore'
  | 'llm'
  | 'chain'

export type PipelineType = 'ml' | 'llm'

export interface NodePort {
  id: string
  label: string
  type: PortType
}

export interface NodeDefinition {
  /** Unique node type ID, e.g. "sklearn.train.random_forest" */
  id: string
  category: NodeCategory
  pipeline: PipelineType
  label: string
  description: string
  icon: string
  /** Node brand color for the canvas card header */
  color: string
  inputs: NodePort[]
  outputs: NodePort[]
  /** JSON Schema rendered as a config form in the Inspector panel */
  configSchema: JSONSchema7
  /** Maps to a Jinja2 template filename in backend/app/templates/ */
  codeTemplateId: string
  /** pip packages required by this node's generated code */
  requiredPackages: string[]
}
