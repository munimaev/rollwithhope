import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// base читается из окружения — на GitHub Pages это "/rollwithhope/",
// локально ("npm run dev") — "/".
const base = process.env.SITE_BASE ?? '/rollwithhope/'

export default defineConfig({
  base,
  // content/pages/**/*.vue приходят с уже готовыми абсолютными URL картинок (запечены
  // в sync с учётом base, см. scripts/sync/images.ts) — не нужно, чтобы Vite пытался
  // резолвить их как локальные файлы/модули через встроенный transformAssetUrls.
  plugins: [vue({ template: { transformAssetUrls: false } })],
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
