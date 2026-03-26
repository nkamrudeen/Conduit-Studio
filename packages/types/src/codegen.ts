import type { PipelineDAG } from './pipeline'

export type CodeGenFormat = 'python' | 'notebook' | 'kubeflow' | 'docker'

export interface CodeGenRequest {
  dag: PipelineDAG
  format: CodeGenFormat
}

export interface CodeGenResponse {
  format: CodeGenFormat
  /** Generated code content */
  code: string
  /** Suggested filename for download */
  filename: string
  /** All pip packages required by the generated code */
  requiredPackages: string[]
  warnings: string[]
}
