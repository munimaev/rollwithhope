import { visit } from 'unist-util-visit'
import type { Root, Paragraph, Text } from 'mdast'

// [[Тир 1|Тир 1]] • [[Тир 2|Тир 2]] • … — ручной ряд быстрой навигации по связанным
// страницам, целиком через « • » и ничего больше (решение из patterns.md: не выводить).
const TIER_NAV_RE = /^\S+(\s*•\s*\S+)+$/u

/** «⬅️ Предыдущая страница: [[…]]» / «➡️ Следующая страница: [[…]]» — ручная навигация
 * автора, не выводится на сайте (заменяется сгенерированным nav.series, см.
 * templates/guidelines/40-markup-contract.md, «Из заметки в разметку»). Ряд ссылок
 * через « • » — тоже не выводится (patterns.md). */
export function remarkDropPrevNext() {
  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || typeof index !== 'number') return
      const raw = node.children.map((c) => (c.type === 'text' ? (c as Text).value : '')).join('')
      const first = node.children[0]
      const startsWithArrow = first?.type === 'text' && /^[⬅➡]/u.test((first as Text).value.trimStart())
      if (startsWithArrow || (node.children.length === 1 && TIER_NAV_RE.test(raw.trim()))) {
        parent.children.splice(index, 1)
        return index // не сдвигать индекс визита после удаления
      }
    })
  }
}
