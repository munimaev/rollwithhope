import type { Component } from 'vue'

// Тела статей — настоящие Vue SFC, собранные sync-скриптом (content/pages/**/*.vue).
// eager: true — все страницы попадают в бандл на этапе сборки, нужно для vite-ssg
// (пререндер каждого маршрута в HTML на этапе build, без раннера в браузере).
const modules = import.meta.glob('/content/pages/**/*.vue', { eager: true, import: 'default' }) as Record<string, Component>

const byId = new Map<string, Component>()
for (const [path, component] of Object.entries(modules)) {
  const id = path.replace(/^\/content\/pages\//, '').replace(/\.vue$/, '')
  byId.set(id, component)
}

export function getArticleComponent(pageId: string): Component | undefined {
  return byId.get(pageId)
}
