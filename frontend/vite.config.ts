import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const mapDataDir = fileURLToPath(new URL('../map-data', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // MapLibre resolves its web worker with
    // `new URL('./maplibre-gl-worker.mjs', import.meta.url)`. If the library is
    // pre-bundled into node_modules/.vite/deps, that URL points at the deps
    // directory, where the worker file does not exist - the request 404s, no
    // workers start, and the style never finishes loading. Excluding it keeps
    // import.meta.url inside the package's own dist directory.
    exclude: ['maplibre-gl'],
  },
  resolve: {
    alias: {
      // Real geographic reference data lives in the repository-level map-data/
      // directory, outside this package, so the backend can use the same files.
      '@map-data': mapDataDir,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      // Required because @map-data resolves outside the Vite project root.
      allow: ['..'],
    },
  },
})
