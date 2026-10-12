import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) return 'firebase-auth'
          if (
            id.includes('node_modules/firebase') ||
            id.includes('node_modules/@firebase') ||
            id.includes('node_modules/idb')
          )
            return 'firebase'
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts'
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/zod') ||
            id.includes('node_modules/@hookform') ||
            id.includes('node_modules/@radix-ui/react-form')
          )
            return 'forms'
          if (id.includes('node_modules/date-fns')) return 'datefns'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
