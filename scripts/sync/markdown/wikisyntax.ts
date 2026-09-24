import type { VaultIndex } from '../vault-index.js'
import type { ImageEntry } from '../images.js'
import { ImageExporter } from '../images.js'
import { headingSlug } from './headings.js'

const TOKEN_OPEN = 'WT'
const TOKEN_CLOSE = ''

interface WikiMatch {
  token: string
  kind: 'embed' | 'link' | 'anchor'
  target: string
  sizeHint: number | null // для embed
  alias: string | null // для link/anchor
}

/** Заменяет [[...]] и ![[...]] в исходном markdown на непрозрачные токены —
 * так остальной pipeline (remark/rehype) не видит и не портит этот синтаксис.
 * Токены безопасны для HTML (не содержат <>&), поэтому финальная строковая
 * замена в готовом HTML ничего не ломает. */
export function extractWikiTokens(markdown: string): { tokenized: string; matches: WikiMatch[] } {
  const matches: WikiMatch[] = []
  let i = 0

  let tokenized = markdown.replace(/!\[\[([^\]|]+?)(?:\|(\d+))?\]\]/g, (_m, target, size) => {
    const token = `${TOKEN_OPEN}${i++}${TOKEN_CLOSE}`
    matches.push({ token, kind: 'embed', target: target.trim().replace(/\\+$/, ''), sizeHint: size ? Number(size) : null, alias: null })
    return token
  })

  // Внутристатейный якорь [[#Заголовок]] / [[#Заголовок|текст]] — target пуст, есть только #часть.
  tokenized = tokenized.replace(/\[\[#([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, heading, alias) => {
    const token = `${TOKEN_OPEN}${i++}${TOKEN_CLOSE}`
    matches.push({ token, kind: 'anchor', target: heading.trim(), sizeHint: null, alias: alias ? alias.trim() : null })
    return token
  })

  tokenized = tokenized.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
    const token = `${TOKEN_OPEN}${i++}${TOKEN_CLOSE}`
    matches.push({ token, kind: 'link', target: target.trim().replace(/\\+$/, ''), sizeHint: null, alias: alias ? alias.trim() : null })
    return token
  })

  return { tokenized, matches }
}

/** Первая строка тела — вставка картинки (`![[баннер.webp]]`)? По контракту
 * (`40-markup-contract.md`) это баннер статьи — рендерится в `.hero > .banner`,
 * не как обычная `.illustration` в теле. Карточки и исключённые картинки баннерами
 * не считаются — остаются обычным эмбедом в теле (resolveEmbed сам разберётся). */
export function extractBannerEmbed(
  bodyRaw: string,
  imageIndex: Map<string, ImageEntry[]>,
): { target: string; entry: ImageEntry; rest: string } | null {
  const trimmed = bodyRaw.replace(/^\s+/, '')
  const m = /^!\[\[([^\]|]+?)(?:\|\d+)?\]\]/.exec(trimmed)
  if (!m) return null

  const target = m[1].trim().replace(/\\+$/, '')
  const basename = target.split('/').pop()!
  if (!IMAGE_EXT.test(basename)) return null

  const entry = imageIndex.get(basename)?.[0]
  if (!entry || entry.excluded || entry.isCard) return null

  const rest = trimmed.slice(m[0].length).replace(/^\r?\n/, '')
  return { target, entry, rest }
}

export interface WikiResolveContext {
  vaultIndex: VaultIndex
  urlMap: Map<string, string>
  imageIndex: Map<string, ImageEntry[]>
  imageExporter: ImageExporter
  currentUrl: string
  warnings: string[]
  backlinks: Map<string, Set<string>>
}

export async function resolveWikiTokens(
  matches: WikiMatch[],
  ctx: WikiResolveContext,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()

  for (const m of matches) {
    if (m.kind === 'anchor') {
      const label = escapeHtml(m.alias ?? m.target)
      out.set(m.token, `<a href="#${headingSlug(m.target)}">${label}</a>`)
    } else if (m.kind === 'link') {
      out.set(m.token, resolveLink(m, ctx))
    } else {
      out.set(m.token, await resolveEmbed(m, ctx))
    }
  }
  return out
}

function resolveLink(m: WikiMatch, ctx: WikiResolveContext): string {
  const note = ctx.vaultIndex.resolve(m.target)
  const label = escapeHtml(m.alias ?? m.target.split('/').pop() ?? m.target)
  if (!note) {
    ctx.warnings.push(`Ссылка на несуществующую заметку: [[${m.target}]] (в ${ctx.currentUrl})`)
    return `<span class="wikilink wikilink--dead">${label}</span>`
  }
  const url = ctx.urlMap.get(note.vaultRelPath)
  if (!url || !note.isPublic) {
    ctx.warnings.push(`Ссылка на неопубликованную заметку: [[${m.target}]] (в ${ctx.currentUrl})`)
    return `<span class="wikilink wikilink--dead">${label}</span>`
  }
  const set = ctx.backlinks.get(url) ?? new Set<string>()
  set.add(ctx.currentUrl)
  ctx.backlinks.set(url, set)
  return `<a class="wikilink" href="${url}">${label}</a>`
}

export const IMAGE_EXT = /\.(webp|png|jpe?g|svg|gif)$/i

async function resolveEmbed(m: WikiMatch, ctx: WikiResolveContext): Promise<string> {
  const basename = m.target.split('/').pop()!

  if (!IMAGE_EXT.test(basename)) {
    // Эмбед без расширения файла — это не картинка, а транслюзия другой заметки
    // (![[Название заметки]]). Полноценной транслюзии пока нет (разделы вроде
    // "Противники" ещё не публикуются) — деградируем до ссылки/текста по тем же
    // правилам, что и обычная вики-ссылка на неопубликованное.
    return resolveLink({ ...m, kind: 'link', alias: m.alias }, ctx)
  }

  const candidates = ctx.imageIndex.get(basename)
  if (!candidates || candidates.length === 0) {
    throw new Error(`Битая вставка картинки: ![[${m.target}]] (в ${ctx.currentUrl}) — файл не найден в 90︱🗂️︱Изображения`)
  }
  const entry = candidates[0]

  if (entry.excluded) {
    const { width, height } = await ctx.imageExporter.originalAspect(entry)
    return `<figure class="card-placeholder" style="aspect-ratio:${width}/${height}" aria-label="Изображение пока не опубликовано"></figure>`
  }

  if (entry.isCard) {
    const { url330, url660, width, height } = await ctx.imageExporter.exportCard(entry)
    return (
      `<figure><img data-lightbox data-full="${url660}" src="${url330}" width="330" ` +
      `height="${Math.round((330 * height) / width)}" loading="lazy" alt="${escapeHtml(basename)}" /></figure>`
    )
  }

  const { url, width, height } = await ctx.imageExporter.exportMedia(entry)
  const widthPct = m.sizeHint ? Math.min(100, Math.round((m.sizeHint / 800) * 100)) : 100
  return (
    `<figure class="illustration" style="--dh-img-width:${widthPct}%">` +
    `<img src="${url}" width="${width}" height="${height}" loading="lazy" alt="${escapeHtml(basename)}" /></figure>`
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function applyWikiTokens(html: string, tokenMap: Map<string, string>): string {
  let out = html
  for (const [token, replacement] of tokenMap) {
    out = out.split(token).join(replacement)
  }
  return out
}
