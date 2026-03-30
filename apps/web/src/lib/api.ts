/**
 * Returns the base URL for all backend API calls.
 *
 * - Browser dev (Vite): returns '/api' — the Vite proxy rewrites to http://localhost:8000
 * - Electron production: the page loads from file://, so relative paths don't reach the
 *   backend.  Return the absolute backend URL directly.
 */
export function getApiBase(): string {
  const proto = window.location.protocol
  if (proto === 'file:' || proto === 'app:') {
    // Electron — backend always on localhost:8000
    return 'http://localhost:8000'
  }
  // Browser dev / web deployment — go through Vite proxy
  return '/api'
}
