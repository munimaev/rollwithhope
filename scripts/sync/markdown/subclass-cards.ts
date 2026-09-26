import type { Root, Paragraph, PhrasingContent } from 'mdast'
import { IMAGE_EXT, resolveLinkTarget, type WikiMatch, type WikiResolveContext } from './wikisyntax.js'

const TITLE_RE = /^\[!subclacc\]\s*(.*)$/

interface ParsedCard {
  name: string
  href: string | null
  hasArt: boolean
  artUrl?: string
  artWidth?: number
  artHeight?: number
  desc: PhrasingContent[]
}

/** `> [!subclacc] Подкласс <Имя>` с картинкой и абзацем-тизером внутри — не обычный
 * колаут (см. Design System/Компоненты/SubclassCard.md в хранилище). Несколько таких
 * колаутов подряд превращаются в один `div.subclass-cards` с карточками `a.subclass-card`.
 * Раскладка (2 в ряд / 1 на мобильном) — забота CSS. Должен идти раньше remarkCallouts,
 * иначе тот успеет превратить блоки в generic `.callout-unknown`. */
export function remarkSubclassCards(matches: WikiMatch[], ctx: WikiResolveContext) {
  return async (tree: Root) => {
    tree.children = (await processChildren(tree.children as unknown[], matches, ctx)) as Root['children']
  }
}

async function processChildren(children: unknown[], matches: WikiMatch[], ctx: WikiResolveContext): Promise<unknown[]> {
  const result: unknown[] = []
  let i = 0
  while (i < children.length) {
    const first = await parseCallout(children[i], matches, ctx)
    if (!first) {
      const node = children[i] as { children?: unknown[] }
      if (Array.isArray(node.children)) node.children = await processChildren(node.children, matches, ctx)
      result.push(children[i])
      i++
      continue
    }
    const group: ParsedCard[] = [first]
    i++
    while (i < children.length) {
      const next = await parseCallout(children[i], matches, ctx)
      if (!next) break
      group.push(next)
      i++
    }
    result.push(buildGroupNode(group))
  }
  return result
}

async function parseCallout(node: unknown, matches: WikiMatch[], ctx: WikiResolveContext): Promise<ParsedCard | null> {
  const bq = node as { type?: string; children?: unknown[] }
  if (bq.type !== 'blockquote' || !bq.children || bq.children.length === 0) return null

  const head = bq.children[0] as { type?: string; children?: unknown[] }
  if (head.type !== 'paragraph' || !head.children || head.children.length === 0) return null
  const headText = head.children[0] as { type?: string; value?: string }
  if (headText.type !== 'text' || typeof headText.value !== 'string') return null

  // Заголовок колаута и первая строка тела (картинка) лежат в одном текстовом узле,
  // разделённые "\n" — soft line break внутри markdown не даёт отдельного узла.
  const lines = headText.value.split('\n')
  const m = TITLE_RE.exec(lines[0])
  if (!m) return null
  const name = m[1].replace(/^Подкласс\s+/i, '').trim()

  const restOfHead = lines.slice(1).join('\n')
  const embedMatch = matches.find((mm) => mm.kind === 'embed' && restOfHead.includes(mm.token))
  const teaserPara = bq.children.find((c, idx) => idx > 0 && (c as { type?: string }).type === 'paragraph') as
    | { children?: PhrasingContent[] }
    | undefined
  const linkMatch = teaserPara?.children ? findMatch(teaserPara.children, matches, 'link') : undefined

  let href: string | null = null
  let desc: PhrasingContent[] = teaserPara?.children ?? []
  if (linkMatch) {
    const resolved = resolveLinkTarget(linkMatch, ctx)
    href = resolved.url
    if (teaserPara?.children) replaceToken(teaserPara.children, linkMatch.token, resolved.label)
    desc = teaserPara!.children!
  } else {
    ctx.warnings.push(`Карточка подкласса «${name}» без ссылки на подкласс (в ${ctx.currentUrl})`)
  }

  const card: ParsedCard = { name, href, hasArt: false, desc }

  if (embedMatch) {
    const basename = embedMatch.target.split('/').pop()!
    if (IMAGE_EXT.test(basename)) {
      const candidates = ctx.imageIndex.get(basename)
      if (!candidates || candidates.length === 0) {
        throw new Error(`Битая вставка картинки в карточке подкласса: ![[${embedMatch.target}]] (в ${ctx.currentUrl})`)
      }
      const entry = candidates[0]
      if (!entry.excluded) {
        const { url, width, height } = await ctx.imageExporter.exportMedia(entry)
        card.hasArt = true
        card.artUrl = url
        card.artWidth = width
        card.artHeight = height
      }
    }
  }

  return card
}

function findMatch(nodes: unknown[], matches: WikiMatch[], kind: WikiMatch['kind']): WikiMatch | undefined {
  for (const node of nodes) {
    const n = node as { type?: string; value?: string; children?: unknown[] }
    if (n.type === 'text' && typeof n.value === 'string') {
      const found = matches.find((mm) => mm.kind === kind && n.value!.includes(mm.token))
      if (found) return found
    } else if (Array.isArray(n.children)) {
      const found = findMatch(n.children, matches, kind)
      if (found) return found
    }
  }
  return undefined
}

function replaceToken(nodes: unknown[], token: string, replacement: string): void {
  for (const node of nodes) {
    const n = node as { type?: string; value?: string; children?: unknown[] }
    if (n.type === 'text' && typeof n.value === 'string' && n.value.includes(token)) {
      n.value = n.value.split(token).join(replacement)
    } else if (Array.isArray(n.children)) {
      replaceToken(n.children, token, replacement)
    }
  }
}

function buildGroupNode(cards: ParsedCard[]): Paragraph {
  return {
    type: 'paragraph',
    children: cards.map(buildCardNode) as unknown as PhrasingContent[],
    data: { hName: 'div', hProperties: { className: ['subclass-cards'] } },
  } as unknown as Paragraph
}

function buildCardNode(card: ParsedCard): Paragraph {
  const children: unknown[] = []

  if (card.hasArt) {
    children.push({
      type: 'paragraph',
      children: [],
      data: {
        hName: 'figure',
        hProperties: { className: ['subclass-card-art'] },
        hChildren: [
          {
            type: 'element',
            tagName: 'img',
            properties: { src: card.artUrl, width: card.artWidth, height: card.artHeight, loading: 'lazy', alt: '' },
            children: [],
          },
        ],
      },
    })
  } else {
    children.push({
      type: 'paragraph',
      children: [],
      data: { hName: 'div', hProperties: { className: ['subclass-card-art'] } },
    })
  }

  children.push({
    type: 'paragraph',
    children: [{ type: 'text', value: 'Подкласс' }],
    data: { hName: 'p', hProperties: { className: ['subclass-card-eyebrow'] } },
  })
  children.push({
    type: 'paragraph',
    children: [{ type: 'text', value: card.name }],
    data: { hName: 'p', hProperties: { className: ['subclass-card-title'] } },
  })
  children.push({
    type: 'paragraph',
    children: card.desc,
    data: { hName: 'p', hProperties: { className: ['subclass-card-desc'] } },
  })

  return {
    type: 'paragraph',
    children: children as unknown as PhrasingContent[],
    data: {
      hName: 'a',
      hProperties: { className: ['subclass-card'], href: card.href ?? '#', 'data-has-art': String(card.hasArt) },
    },
  } as unknown as Paragraph
}
