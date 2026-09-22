import { visit } from 'unist-util-visit'
import type { Root, Blockquote, Paragraph, Text } from 'mdast'

const KNOWN_TYPES = new Set(['dh-step', 'example', 'tip', 'quote', 'todo'])

/** > [!tip] Заголовок
 *  > текст...
 * -> <div class="dh-callout dh-callout-tip">...</div>, заголовок (если есть)
 * остаётся первой строкой содержимого (оформление — забота CSS/Design System). */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0]
      if (!first || first.type !== 'paragraph') return
      const p = first as Paragraph
      const firstChild = p.children[0]
      if (!firstChild || firstChild.type !== 'text') return
      const text = firstChild as Text
      const m = /^\[!(\w[\w-]*)\]\s*(.*)$/.exec(text.value)
      if (!m) return
      const type = m[1].toLowerCase()
      const title = m[2]

      if (title) {
        text.value = title
      } else {
        p.children.shift()
        // если сразу за маркером шёл перенос строки — уберём его, чтобы не было пустой первой строки
        if (p.children[0]?.type === 'break') p.children.shift()
      }

      ;(node.data ??= {}).hName = 'div'
      ;(node.data as any).hProperties = {
        className: ['dh-callout', `dh-callout-${type}`, ...(KNOWN_TYPES.has(type) ? [] : ['dh-callout-unknown'])],
      }
    })
  }
}
