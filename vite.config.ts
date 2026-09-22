import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// base читается из окружения — на GitHub Pages это "/rollwithhope/",
// локально ("npm run dev") — "/".
const base = process.env.SITE_BASE ?? '/rollwithhope/'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
  },
})
