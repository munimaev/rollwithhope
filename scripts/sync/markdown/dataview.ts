import { visit } from 'unist-util-visit'
import type { Root, Code } from 'mdast'

export interface TagRef {
  url: string
  title: string
}

const TAG_PATTERN = /dv\.pages\(\s*["']#([\w-]+)["']\s*\)/

/**
 * Поддерживаемые dataviewjs-блоки — таблицы по тегу (3 колонки, dv.pages("#tag").sort(...)),
 * сейчас встречаются для #ancestry и #community. Любой другой dataview/dataviewjs —
 * жёсткая остановка, чтобы контент не терялся молча (см. Архитектура.md).
 */
export function remarkDataview(byTag: Map<string, TagRef[]>) {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'dataview' && node.lang !== 'dataviewjs') return
      if (node.lang === 'dataview') {
        throw new Error(`Неподдерживаемый dataview-блок:\n${node.value.slice(0, 200)}`)
      }
      const m = TAG_PATTERN.exec(node.value)
      const tag = m?.[1]
      if (!tag || !byTag.has(tag)) {
        throw new Error(`Неподдерживаемый dataviewjs-блок (не таблица по известному тегу):\n${node.value.slice(0, 200)}`)
      }
      const items = byTag.get(tag)!
      const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
      const rows: string[] = []
      for (let i = 0; i < sorted.length; i += 3) {
        const cells = [sorted[i], sorted[i + 1], sorted[i + 2]]
          .map((a) => (a ? `<td><a href="${a.url}">${escapeHtml(a.title)}</a></td>` : '<td></td>'))
          .join('')
        rows.push(`<tr>${cells}</tr>`)
      }
      const html = `<table class="dh-tag-table dh-tag-table-${tag}"><tbody>${rows.join('')}</tbody></table>`
      const htmlNode = { type: 'html', value: html } as any
      if (parent && typeof index === 'number') parent.children[index] = htmlNode
    })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
