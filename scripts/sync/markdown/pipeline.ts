import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { remarkCallouts } from './callouts.js'
import { remarkDisallowRawHtml } from './disallow-html.js'
import { remarkRawHtmlElements } from './raw-html-elements.js'
import { remarkDataview, type TagRef } from './dataview.js'
import { extractWikiTokens, resolveWikiTokens, applyWikiTokens, type WikiResolveContext } from './wikisyntax.js'

export interface RenderContext extends WikiResolveContext {
  tagLists: Map<string, TagRef[]>
}

/** markdown (тело заметки, без frontmatter) -> HTML тела статьи. */
export async function renderMarkdown(markdown: string, ctx: RenderContext): Promise<string> {
  const { tokenized, matches } = extractWikiTokens(markdown)

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkCallouts)
    .use(remarkDisallowRawHtml)
    .use(remarkRawHtmlElements)
    .use(remarkDataview, ctx.tagLists)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })

  const file = await processor.process(tokenized)
  let html = String(file)

  const tokenMap = await resolveWikiTokens(matches, ctx)
  html = applyWikiTokens(html, tokenMap)

  return html
}
