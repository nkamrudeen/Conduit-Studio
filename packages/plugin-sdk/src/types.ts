/** Plugin manifest — lives at the root of each plugin as plugin.manifest.json */
export interface PluginManifest {
  id: string              // e.g. "com.example.connector-s3"
  name: string
  version: string
  description: string
  author?: string
  license?: string
  category: 'connector' | 'transform' | 'model' | 'deploy' | 'monitor' | 'utility'
  entrypoint: string      // relative path to the plugin's HTML entry (loaded in iframe)
  nodeTypes: string[]     // node definition IDs this plugin contributes
  permissions: PluginPermission[]
  apiVersion: '1'
  icon?: string
  homepage?: string
}

export type PluginPermission = 'network' | 'credentials' | 'filesystem' | 'subprocess'

// ── Message types (postMessage API) ──────────────────────────────────────────

export type HostToPluginMessage =
  | { type: 'INIT'; config: PluginInitConfig }
  | { type: 'GET_CONFIG_SCHEMA'; nodeTypeId: string }
  | { type: 'NODE_EXECUTE'; nodeId: string; nodeTypeId: string; inputs: Record<string, unknown>; config: Record<string, unknown> }
  | { type: 'GET_NODE_LIST' }
  | { type: 'PING' }

export type PluginToHostMessage =
  | { type: 'READY' }
  | { type: 'REGISTER_NODE'; definition: PluginNodeDefinition }
  | { type: 'CONFIG_SCHEMA'; nodeTypeId: string; schema: Record<string, unknown> }
  | { type: 'EXECUTION_RESULT'; nodeId: string; outputs: Record<string, unknown> }
  | { type: 'EXECUTION_ERROR'; nodeId: string; error: string }
  | { type: 'LOG'; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'PONG' }

export interface PluginInitConfig {
  pluginId: string
  hostVersion: string
  credentials?: Record<string, string>
}

/** Subset of NodeDefinition that a plugin can declare */
export interface PluginNodeDefinition {
  id: string
  category: string
  pipeline: 'ml' | 'llm' | 'both'
  label: string
  description: string
  icon: string
  color: string
  inputs: Array<{ id: string; label: string; type: string }>
  outputs: Array<{ id: string; label: string; type: string }>
  configSchema: Record<string, unknown>
  codeTemplateId: string
  requiredPackages: string[]
}

export interface PluginInstance {
  manifest: PluginManifest
  iframe: HTMLIFrameElement
  origin: string
  ready: boolean
}
