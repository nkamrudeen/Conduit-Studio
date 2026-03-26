import type { NodeDefinition } from './node'
import type { JSONSchema7 } from 'json-schema'

export type PluginCategory = 'connector' | 'transform' | 'ml' | 'llm' | 'deploy' | 'monitor'
export type PluginPermission = 'network' | 'credentials' | 'filesystem'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: PluginCategory
  /** Path to the plugin's iframe entrypoint HTML file */
  entrypoint: string
  /** Node type IDs this plugin registers */
  nodeTypes: string[]
  permissions: PluginPermission[]
  /** Plugin SDK API version this plugin targets */
  apiVersion: '1'
}

export interface PluginState {
  manifest: PluginManifest
  status: 'loading' | 'active' | 'error' | 'disabled'
  error?: string
}

// ── postMessage API ──────────────────────────────────────────────────────────

/** Messages sent from Host → Plugin iframe */
export type HostToPluginMessage =
  | { type: 'INIT'; pluginId: string }
  | { type: 'GET_CONFIG_SCHEMA'; nodeTypeId: string }
  | { type: 'NODE_EXECUTE'; nodeId: string; inputs: Record<string, unknown> }

/** Messages sent from Plugin iframe → Host */
export type PluginToHostMessage =
  | { type: 'REGISTER_NODE'; definition: NodeDefinition }
  | { type: 'CONFIG_SCHEMA'; nodeTypeId: string; schema: JSONSchema7 }
  | { type: 'EXECUTION_RESULT'; nodeId: string; outputs: Record<string, unknown> }
  | { type: 'EXECUTION_ERROR'; nodeId: string; error: string }
  | { type: 'READY' }
