// Тела статей — уже готовый HTML, собранный sync-скриптом (content/pages/**/*.html).
// eager: true — все страницы попадают в бандл на этапе сборки, это нужно для
// vite-ssg (пререндер каждого маршрута в HTML на этапе build, без раннера в браузере).
const modules = import.meta.glob('/content/pages/**/*.html', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const byId = new Map<string, string>()
for (const [path, html] of Object.entries(modules)) {
  const id = path.replace(/^\/content\/pages\//, '').replace(/\.html$/, '')
  byId.set(id, html)
}

export function getArticleHtml(pageId: string): string | undefined {
  return byId.get(pageId)
}
