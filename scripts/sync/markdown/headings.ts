import { visit } from 'unist-util-visit'
import type { Root, Heading, Paragraph, Text, Strong } from 'mdast'

// 🟢🟠🟣🔴🔵 — цвет главы (data-marker="chapter"), 🟨 — «узкий» (data-marker="minor").
// См. templates/guidelines/40-markup-contract.md, «Из заметки в разметку».
const CHAPTER_MARKERS = new Set(['🟢', '🟠', '🟣', '🔴', '🔵'])
const MINOR_MARKER = '🟨'
const LEADING_MARKER_RE = /^(🟢|🟠|🟣|🔴|🔵|🟨)\s*/u

/** Убирает маркер-эмодзи главы/минор с начала текста заголовка, если он там есть. */
export function stripLeadingMarker(text: string): string {
  return text.replace(LEADING_MARKER_RE, '')
}

/** slug для id заголовка/якоря — без транслитерации (кириллица допустима, см. контракт),
 * только без пробелов/пунктуации. */
export function headingSlug(text: string): string {
  const base = stripLeadingMarker(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'section'
}

function headingText(node: Heading): string {
  return node.children
    .map((c) => (c.type === 'text' ? (c as Text).value : c.type === 'inlineCode' ? (c as any).value : ''))
    .join('')
}

/** h2–h6 с эмодзи-маркером → <hN id="slug"><span class="marker" data-marker="…"/>Текст
 * <a class="anchor" href="#slug" aria-label="Ссылка на раздел"/></hN>, эмодзи вырезается.
 * Без маркера — тот же id/anchor, но без .marker (контракт не запрещает id на любом hN,
 * а не только h2 — нужно для резолва внутристатейных [[#Заголовок]]). */
/** `🟨 **Текст**` отдельным абзацем (без `#`) — псевдо-заголовок, встречается перед
 * названием хода/способности (напр. свойство Надежды класса). Поднимаем в настоящий
 * заголовок h5, чтобы он попал в id/маркер/оглавление наравне с обычными заголовками —
 * решение принято в живом разборе паттернов (patterns.md), не часть исходного контракта. */
function promoteParagraph(node: Paragraph): Heading | null {
  if (node.children.length !== 2) return null
  const [first, second] = node.children
  if (first.type !== 'text' || !(first as Text).value.trim().startsWith(MINOR_MARKER)) return null
  if ((first as Text).value.replace(MINOR_MARKER, '').trim() !== '') return null
  if (second.type !== 'strong') return null
  const strong = second as Strong
  return { type: 'heading', depth: 5, children: [{ type: 'text', value: MINOR_MARKER + ' ' } as Text, ...strong.children] }
}

export function remarkHeadings() {
  const used = new Set<string>()
  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || typeof index !== 'number') return
      const promoted = promoteParagraph(node)
      if (promoted) (parent as Root).children[index] = promoted as any
    })
    visit(tree, 'heading', (node: Heading) => {
      const raw = headingText(node)
      const marker = [...CHAPTER_MARKERS].some((e) => raw.startsWith(e))
        ? 'chapter'
        : raw.startsWith(MINOR_MARKER)
          ? 'minor'
          : null

      const firstChild = node.children[0]
      if (marker && firstChild?.type === 'text') {
        (firstChild as Text).value = stripLeadingMarker((firstChild as Text).value)
      }

      let slug = headingSlug(raw)
      let n = 2
      while (used.has(slug)) slug = `${headingSlug(raw)}-${n++}`
      used.add(slug)

      if (marker) {
        node.children.unshift({
          type: 'markerEl',
          data: { hName: 'span', hProperties: { className: ['marker'], 'data-marker': marker } },
          children: [],
        } as any)
      }
      node.children.push({
        type: 'anchorEl',
        data: { hName: 'a', hProperties: { className: ['anchor'], href: `#${slug}`, 'aria-label': 'Ссылка на раздел' } },
        children: [],
      } as any)

      ;(node.data ??= {}).hProperties = { ...(node.data as any)?.hProperties, id: slug }
    })
  }
}
