// vite-ssg рендерит статические страницы с lang="en" по умолчанию (шаблон index.html
// не наследуется его SSR-рендерером) — простановка правильного lang постфактум.
import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve('dist')
let count = 0
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(p, 'utf8')
      const fixed = html.replace(/<html lang="en">/, '<html lang="ru">')
      if (fixed !== html) { fs.writeFileSync(p, fixed, 'utf8'); count++ }
    }
  }
}
walk(distDir)
console.log(`fix-lang: обновлено файлов: ${count}`)
