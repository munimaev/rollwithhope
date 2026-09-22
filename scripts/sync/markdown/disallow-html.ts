import { visit } from 'unist-util-visit'
import type { Root, Html } from 'mdast'

const ALLOWED_TAGS = new Set(['span', 'br', 'img'])

/** Разрешённый "сырой" HTML в заметках — только <span> (цвет, плагин colored-text),
 * <br>, <img>. Всё остальное — жёсткая остановка сборки (см. Архитектура.md). */
export function remarkDisallowRawHtml() {
  return (tree: Root) => {
    visit(tree, 'html', (node: Html, _index, parent) => {
      const m = /^<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/.exec(node.value)
      if (!m) return // комментарии и т.п. — пропускаем
      const tag = m[1].toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        throw new Error(`Запрещённый HTML-тег <${tag}> в заметке — разрешены только span/br/img. Фрагмент: ${node.value.slice(0, 80)}`)
      }
    })
  }
}
