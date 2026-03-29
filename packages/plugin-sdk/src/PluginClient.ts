import type {
  PluginToHostMessage,
  HostToPluginMessage,
  PluginInitConfig,
  PluginNodeDefinition,
} from './types'

type ExecuteHandler = (
  nodeId: string,
  nodeTypeId: string,
  inputs: Record<string, unknown>,
  config: Record<string, unknown>
) => Promise<Record<string, unknown>>

/**
 * PluginClient — runs inside the plugin iframe.
 * Provides a simple API for plugin authors to communicate with the host.
 */
export class PluginClient {
  private hostOrigin: string
  private initConfig?: PluginInitConfig
  private executeHandlers = new Map<string, ExecuteHandler>()
  private configSchemaHandlers = new Map<string, () => Record<string, unknown>>()

  constructor(hostOrigin = '*') {
    this.hostOrigin = hostOrigin
    window.addEventListener('message', this.handleMessage.bind(this))
  }

  /** Register a node type that this plugin provides */
  registerNode(definition: PluginNodeDefinition): void {
    this.sendToHost({ type: 'REGISTER_NODE', definition })
  }

  /** Register a handler for executing a specific node type */
  onExecute(nodeTypeId: string, handler: ExecuteHandler): void {
    this.executeHandlers.set(nodeTypeId, handler)
  }

  /** Register a config schema getter for a node type */
  onConfigSchema(nodeTypeId: string, handler: () => Record<string, unknown>): void {
    this.configSchemaHandlers.set(nodeTypeId, handler)
  }

  /** Get credentials the host injected at INIT time */
  getCredential(key: string): string | undefined {
    return this.initConfig?.credentials?.[key]
  }

  /** Get the plugin's own id */
  getPluginId(): string | undefined {
    return this.initConfig?.pluginId
  }

  /** Send a log message to the host */
  log(level: 'info' | 'warn' | 'error', message: string): void {
    this.sendToHost({ type: 'LOG', level, message })
  }

  /** Signal the host that the plugin is ready */
  ready(): void {
    this.sendToHost({ type: 'READY' })
  }

  private sendToHost(msg: PluginToHostMessage): void {
    window.parent.postMessage(msg, this.hostOrigin)
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const msg = event.data as HostToPluginMessage

    switch (msg.type) {
      case 'INIT':
        this.initConfig = msg.config
        this.sendToHost({ type: 'READY' })
        break

      case 'GET_CONFIG_SCHEMA': {
        const handler = this.configSchemaHandlers.get(msg.nodeTypeId)
        if (handler) {
          const schema = handler()
          this.sendToHost({ type: 'CONFIG_SCHEMA', nodeTypeId: msg.nodeTypeId, schema })
        }
        break
      }

      case 'NODE_EXECUTE': {
        const handler = this.executeHandlers.get(msg.nodeTypeId)
        if (!handler) {
          this.sendToHost({
            type: 'EXECUTION_ERROR',
            nodeId: msg.nodeId,
            error: `No handler registered for node type "${msg.nodeTypeId}"`,
          })
          return
        }
        try {
          const outputs = await handler(msg.nodeId, msg.nodeTypeId, msg.inputs, msg.config)
          this.sendToHost({ type: 'EXECUTION_RESULT', nodeId: msg.nodeId, outputs })
        } catch (err) {
          this.sendToHost({
            type: 'EXECUTION_ERROR',
            nodeId: msg.nodeId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        break
      }

      case 'PING':
        this.sendToHost({ type: 'PONG' })
        break
    }
  }
}
