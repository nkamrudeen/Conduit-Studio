import type { PluginPermission } from './types'

const ALWAYS_ALLOWED = [
  'allow-scripts',
  'allow-same-origin',  // needed for postMessage origin checks
] as const

const PERMISSION_MAP: Record<PluginPermission, string> = {
  network: 'allow-downloads',
  credentials: '',      // no additional sandbox flag needed; controlled via host
  filesystem: 'allow-downloads allow-modals',
  subprocess: '',       // not grantable via sandbox; must run in backend
}

/**
 * Build a sandbox attribute string for an iframe based on declared permissions.
 * Plugins always get `allow-scripts` and `allow-same-origin`.
 */
export function buildSandboxAttr(permissions: PluginPermission[]): string {
  const flags = new Set<string>(ALWAYS_ALLOWED)
  for (const perm of permissions) {
    const extra = PERMISSION_MAP[perm]
    if (extra) {
      for (const flag of extra.split(' ')) {
        if (flag) flags.add(flag)
      }
    }
  }
  return Array.from(flags).join(' ')
}

/**
 * Build a Content-Security-Policy string for the plugin iframe.
 * Restricts the plugin to only what it declared.
 */
export function buildPluginCSP(permissions: PluginPermission[], pluginOrigin: string): string {
  const connectSrc = permissions.includes('network')
    ? "'self' https: wss:"
    : "'self'"

  return [
    `default-src 'none'`,
    `script-src 'self' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `connect-src ${connectSrc}`,
    `frame-ancestors ${pluginOrigin}`,
  ].join('; ')
}
