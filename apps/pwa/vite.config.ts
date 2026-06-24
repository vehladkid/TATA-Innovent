import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// PWA dev server on :3001 (per apps/pwa/README.md).
// @suraksha/shared resolves to the monorepo source of truth (no workspace set up yet).
export default defineConfig({
  plugins: [react()],
  server: { port: 3001 },
  resolve: {
    alias: {
      '@suraksha/shared/contracts': fileURLToPath(
        new URL('../../packages/shared/contracts.ts', import.meta.url),
      ),
    },
  },
})
