import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve workspace packages from their TS source (no pre-build required)
      '@ai-ide/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@ai-ide/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@ai-ide/canvas-engine': path.resolve(__dirname, '../../packages/canvas-engine/src/index.ts'),
      '@ai-ide/node-registry': path.resolve(__dirname, '../../packages/node-registry/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
