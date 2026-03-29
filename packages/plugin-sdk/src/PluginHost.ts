import type {
  PluginManifest,
  PluginInstance,
  HostToPluginMessage,
  PluginToHostMessage,
  PluginNodeDefinition,
} from './types'
import { buildSandboxAttr } from './sandbox'

type NodeRegisteredHandler = (definition: PluginNodeDefinition, pluginId: string) => void
type ExecutionResultHandler = (nodeId: string, outputs: Record<string, unknown>) => void
type ExecutionErrorHandler = (nodeId: string, error: string) => void

/**
 * PluginHost — runs on the IDE (host) side.
 * Manages iframe lifecycle and routes postMessage traffic to/from plugins.
 */
export class PluginHost {
  private plugins = new Map<string, PluginInstance>()
  private onNodeRegistered?: NodeRegisteredHandler
  private onExecutionResult?: ExecutionResultHandler
  private onExecutionError?: ExecutionErrorHandler

  constructor() {
    window.addEventListener('message', this.handleMessage.bind(this))
  }

  /** Load a plugin by creating a sandboxed iframe in `container` */
  loadPlugin(
    manifest: PluginManifest,
    entrypointUrl: string,
    container: HTMLElement,
    credentials?: Record<string, string>
  ): PluginInstance {
    if (this.plugins.has(manifest.id)) {
      return this.plugins.get(manifest.id)!
    }

    const iframe = document.createElement('iframe')
    iframe.src = entrypointUrl
    iframe.sandbox.value = buildSandboxAttr(manifest.permissions)
    iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;'
    iframe.title = `Plugin: ${manifest.name}`
    container.appendChild(iframe)

    const origin = new URL(entrypointUrl).origin

    const instance: PluginInstance = { manifest, iframe, origin, ready: false }
    this.plugins.set(manifest.id, instance)

    // Send INIT once iframe is loaded
    iframe.addEventListener('load', () => {
      this.send(manifest.id, {
        type: 'INIT',
        config: {
          pluginId: manifest.id,
          hostVersion: '1',
          ...(credentials !== undefined && { credentials }),
        },
      })
    })

    return instance
  }

  /** Unload a plugin and remove its iframe */
  unloadPlugin(pluginId: string): void {
    const instance = this.plugins.get(pluginId)
    if (!instance) return
    instance.iframe.remove()
    this.plugins.delete(pluginId)
  }

  /** Send a message to a specific plugin */
  send(pluginId: string, message: HostToPluginMessage): void {
    const instance = this.plugins.get(pluginId)
    if (!instance?.iframe.contentWindow) return
    instance.iframe.contentWindow.postMessage(message, instance.origin)
  }

  /** Request a plugin to execute a node */
  executeNode(
    pluginId: string,
    nodeId: string,
    nodeTypeId: string,
    inputs: Record<string, unknown>,
    config: Record<string, unknown>
  ): void {
    this.send(pluginId, { type: 'NODE_EXECUTE', nodeId, nodeTypeId, inputs, config })
  }

  /** Register callbacks */
  onNodeRegisteredHandler(handler: NodeRegisteredHandler) { this.onNodeRegistered = handler }
  onExecutionResultHandler(handler: ExecutionResultHandler) { this.onExecutionResult = handler }
  onExecutionErrorHandler(handler: ExecutionErrorHandler) { this.onExecutionError = handler }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId)
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  /** Cleanup — remove event listener and all iframes */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this))
    for (const instance of this.plugins.values()) {
      instance.iframe.remove()
    }
    this.plugins.clear()
  }

  private handleMessage(event: MessageEvent): void {
    // Find the plugin instance that sent this message
    const instance = Array.from(this.plugins.values()).find(
      (p) => p.origin === event.origin || p.iframe.contentWindow === event.source
    )
    if (!instance) return

    const msg = event.data as PluginToHostMessage

    switch (msg.type) {
      case 'READY':
        instance.ready = true
        break

      case 'REGISTER_NODE':
        this.onNodeRegistered?.(msg.definition, instance.manifest.id)
        break

      case 'EXECUTION_RESULT':
        this.onExecutionResult?.(msg.nodeId, msg.outputs)
        break

      case 'EXECUTION_ERROR':
        this.onExecutionError?.(msg.nodeId, msg.error)
        break

      case 'LOG':
        console[msg.level]?.(`[Plugin:${instance.manifest.id}]`, msg.message)
        break

      case 'PONG':
        break
    }
  }
}
