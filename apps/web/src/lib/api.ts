/**
 * Returns the base URL for all backend API calls.
 *
 * - Browser dev (Vite): returns '/api' — the Vite proxy rewrites to http://localhost:8000
 * - Electron production: the page loads from file://, so relative paths don't reach the
 *   backend.  Return the absolute backend URL directly.
 */
function isElectron(): boolean {
  return (
    window.location.protocol === 'file:' ||
    window.location.protocol === 'app:' ||
    // Electron static server serves on a random port — detect via user agent
    navigator.userAgent.includes('Electron')
  )
}

export function getApiBase(): string {
  if (isElectron()) {
    // Electron — backend binds to 127.0.0.1; use that directly to avoid
    // localhost→::1 (IPv6) resolution issues on Windows
    return 'http://127.0.0.1:8000'
  }
  // Browser dev / web deployment — go through Vite proxy
  return '/api'
}
