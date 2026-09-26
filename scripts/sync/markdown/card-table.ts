import { visit } from 'unist-util-visit'
import type { Root, Table, TableRow, TableCell, Text } from 'mdast'
import { IMAGE_EXT, type WikiMatch } from './wikisyntax.js'

/** Таблица в заметке, где каждая непустая ячейка (во всех строках, включая
 * шапку) — это ровно одна вставка картинки-карты и ничего больше (без
 * псевдозаголовков уровня — тот паттерн описан отдельно в контракте разметки
 * и здесь не трогается). В заметках так вёрстается сетка карт подкласса
 * (пример: `Бард — Трубадур.md`) — таблица там нужна только чтобы разложить
 * картинки по строкам/столбцам, не для табличных данных.
 *
 * -> `<div class="card-row">` с картами подряд, пустые ячейки-заполнители
 * отбрасываются. Раскладка (сколько карт в ряд) — забота CSS, не разметки. */
export function remarkCardTable(matches: WikiMatch[]) {
  const embedTokens = new Set(
    matches
      .filter((m) => m.kind === 'embed' && IMAGE_EXT.test(m.target.split('/').pop() ?? ''))
      .map((m) => m.token),
  )

  return (tree: Root) => {
    visit(tree, 'table', (node: Table, index, parent) => {
      if (!parent || typeof index !== 'number') return

      const cells: TableCell[] = []
      for (const row of node.children as TableRow[]) {
        cells.push(...(row.children as TableCell[]))
      }
      if (cells.length === 0) return

      const cardTexts: Text[] = []
      for (const cell of cells) {
        if (cell.children.length === 0) continue
        if (cell.children.length !== 1 || cell.children[0].type !== 'text') return
        const text = cell.children[0] as Text
        if (!embedTokens.has(text.value.trim())) return
        cardTexts.push(text)
      }
      if (cardTexts.length === 0) return

      const cardRow = {
        type: 'paragraph',
        children: cardTexts,
        data: { hName: 'div', hProperties: { className: ['card-row'] } },
      } as unknown as Table

      parent.children.splice(index, 1, cardRow)
    })
  }
}
