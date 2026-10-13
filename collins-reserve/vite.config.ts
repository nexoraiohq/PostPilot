import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const functionsOrigin =
  process.env.VITE_API_BASE ?? 'https://us-central1-collins-reserve-demo-42b6.cloudfunctions.net'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: functionsOrigin,
        changeOrigin: true,
      },
    },
  },
})
