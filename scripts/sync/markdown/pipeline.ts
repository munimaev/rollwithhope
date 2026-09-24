import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { remarkCallouts } from './callouts.js'
import { remarkHeadings } from './headings.js'
import { remarkDropPrevNext } from './drop-prevnext.js'
import { remarkDisallowRawHtml } from './disallow-html.js'
import { remarkRawHtmlElements } from './raw-html-elements.js'
import { remarkDataview, type TagRef } from './dataview.js'
import { extractWikiTokens, resolveWikiTokens, applyWikiTokens, type WikiResolveContext } from './wikisyntax.js'

export interface RenderContext extends WikiResolveContext {
  tagLists: Map<string, TagRef[]>
  siteBase: string
}

/** markdown (тело заметки, без frontmatter) -> HTML тела статьи. */
export async function renderMarkdown(markdown: string, ctx: RenderContext): Promise<string> {
  const { tokenized, matches } = extractWikiTokens(markdown)

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCallouts)
    .use(remarkDropPrevNext)
    .use(remarkHeadings)
    .use(remarkDisallowRawHtml)
    .use(remarkRawHtmlElements)
    .use(remarkDataview, ctx.tagLists)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })

  const file = await processor.process(tokenized)
  let html = String(file)

  const tokenMap = await resolveWikiTokens(matches, ctx)
  html = applyWikiTokens(html, tokenMap)

  // Сырой <img src="иконка.svg"> из заметки (разрешён контрактом, см. raw-html-elements.ts) —
  // src без "/"/"http"/"data:" считаем иконкой из public/icons/, запекаем base так же,
  // как в images.ts (относительный путь Vite попытался бы резолвить как модуль-импорт).
  html = html.replace(/(<img[^>]*\ssrc=")(?!\/|https?:|data:)([^"]+)(")/g, (_m, pre, name, post) => `${pre}${ctx.siteBase}icons/${name}${post}`)

  // Контракт разметки: каждая таблица — в <div class="table-wrap"> (и обычные GFM-таблицы,
  // и dataviewjs-таблицы из dataview.ts — те приходят с атрибутами на <table>).
  html = html.replace(/<table(\s[^>]*)?>/g, (_m, attrs = '') => `<div class="table-wrap"><table${attrs ?? ''}>`)
    .replace(/<\/table>/g, '</table></div>')

  return html
}
