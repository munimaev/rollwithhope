import { visit } from 'unist-util-visit'
import type { Root, Html, Parent } from 'mdast'

/**
 * Заменяет разрешённые "сырые" HTML-узлы (span/br/img — уже провалидированные
 * remarkDisallowRawHtml) на настоящие mdast-узлы с hName/hProperties, минуя
 * rehype-raw: полный повторный HTML-парсинг всего документа плохо уживается с
 * GFM-таблицами (foster parenting вытурит контент таблицы, если внутри нашлись
 * "сырые" фрагменты вроде <br>). Точечная замена конкретных узлов этой проблемы
 * не создаёт.
 */
export function remarkRawHtmlElements() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (!parent || typeof index !== 'number' || !('children' in parent)) return
      const children = (parent as Parent).children as any[]
      const html = node as Html
      if (node.type !== 'html') return

      const brMatch = /^<br\s*\/?>$/i.exec(html.value.trim())
      if (brMatch) {
        children[index] = { type: 'html-el', data: { hName: 'br', hProperties: {} }, children: [] }
        return
      }

      const imgMatch = /^<img\b([^>]*)\/?>$/i.exec(html.value.trim())
      if (imgMatch) {
        children[index] = { type: 'html-el', data: { hName: 'img', hProperties: parseAttrs(imgMatch[1]) }, children: [] }
        return
      }

      const spanOpen = /^<span\b([^>]*)>$/i.exec(html.value.trim())
      if (spanOpen) {
        // ищем закрывающий </span> среди последующих детей того же родителя
        let closeIdx = -1
        for (let j = index + 1; j < children.length; j++) {
          const c = children[j]
          if (c.type === 'html' && /^<\/span>$/i.test(String(c.value).trim())) {
            closeIdx = j
            break
          }
        }
        if (closeIdx === -1) return // не нашли пару — оставляем как есть (сырой текст)
        const inner = children.slice(index + 1, closeIdx)
        const wrapper = {
          type: 'html-el',
          data: { hName: 'span', hProperties: parseAttrs(spanOpen[1]) },
          children: inner,
        }
        children.splice(index, closeIdx - index + 1, wrapper)
      }
    })
  }
}

function parseAttrs(attrString: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrString))) {
    const name = m[1] === 'class' ? 'className' : m[1]
    out[name] = m[2]
  }
  return out
}
