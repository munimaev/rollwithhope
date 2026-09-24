import { visit } from 'unist-util-visit'
import type { Root, Blockquote, Paragraph, Text } from 'mdast'

const KNOWN_TYPES = new Set(['dh-step', 'example', 'tip', 'quote', 'todo'])
// Заметки используют `dh-step`, контракт разметки (templates/guidelines/40-markup-contract.md) — `step`.
const TYPE_ALIASES: Record<string, string> = { 'dh-step': 'step' }
// [!todo] — черновая пометка автора, на сайт не выводится (см. markup-contract.md).
const HIDDEN_TYPES = new Set(['todo'])

/** > [!tip] Заголовок
 *  > текст...
 * -> <aside class="callout" data-type="tip"><p class="callout-title">Заголовок</p>...</aside>
 * — контракт разметки §«Выноска». Без заголовка в исходнике — без .callout-title. */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      const first = node.children[0]
      if (!first || first.type !== 'paragraph') return
      const p = first as Paragraph
      const firstChild = p.children[0]
      if (!firstChild || firstChild.type !== 'text') return
      const text = firstChild as Text
      const m = /^\[!(\w[\w-]*)\]\s*(.*)$/.exec(text.value)
      if (!m) return
      const rawType = m[1].toLowerCase()
      const type = TYPE_ALIASES[rawType] ?? rawType
      const title = m[2]

      if (HIDDEN_TYPES.has(rawType)) {
        if (parent && typeof index === 'number') parent.children.splice(index, 1)
        return
      }

      p.children.shift()
      // если сразу за маркером шёл перенос строки — уберём его, чтобы не было пустой первой строки
      if (p.children[0]?.type === 'break') p.children.shift()

      if (title) {
        const titleNode: Paragraph = {
          type: 'paragraph',
          children: [{ type: 'text', value: title } as Text],
          data: { hProperties: { className: ['callout-title'] } } as any,
        }
        node.children.unshift(titleNode)
      }

      ;(node.data ??= {}).hName = 'aside'
      ;(node.data as any).hProperties = {
        className: ['callout', ...(KNOWN_TYPES.has(rawType) ? [] : ['callout-unknown'])],
        'data-type': type,
      }
    })
  }
}
