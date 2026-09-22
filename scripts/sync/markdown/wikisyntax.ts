import type { VaultIndex } from '../vault-index.js'
import type { ImageEntry } from '../images.js'
import { ImageExporter } from '../images.js'

const TOKEN_OPEN = 'WT'
const TOKEN_CLOSE = ''

interface WikiMatch {
  token: string
  kind: 'embed' | 'link'
  target: string
  sizeHint: number | null // для embed
  alias: string | null // для link
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

  tokenized = tokenized.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
    const token = `${TOKEN_OPEN}${i++}${TOKEN_CLOSE}`
    matches.push({ token, kind: 'link', target: target.trim().replace(/\\+$/, ''), sizeHint: null, alias: alias ? alias.trim() : null })
    return token
  })

  return { tokenized, matches }
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
    if (m.kind === 'link') {
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
    return label
  }
  const url = ctx.urlMap.get(note.vaultRelPath)
  if (!url || !note.isPublic) {
    ctx.warnings.push(`Ссылка на неопубликованную заметку: [[${m.target}]] (в ${ctx.currentUrl})`)
    return label
  }
  const set = ctx.backlinks.get(url) ?? new Set<string>()
  set.add(ctx.currentUrl)
  ctx.backlinks.set(url, set)
  return `<a href="${url}">${label}</a>`
}

const IMAGE_EXT = /\.(webp|png|jpe?g|svg|gif)$/i

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
    return `<span class="dh-image-placeholder dh-card" style="--dh-ph-ratio:${(height / width).toFixed(4)}" aria-label="Изображение пока не опубликовано"></span>`
  }

  if (entry.isCard) {
    const { url, width, height } = await ctx.imageExporter.exportCard(entry)
    return (
      `<button type="button" class="dh-card" data-full="${url}" data-w="${width}" data-h="${height}">` +
      `<img src="${url}" width="330" height="${Math.round((330 * height) / width)}" loading="lazy" alt="${escapeHtml(basename)}" /></button>`
    )
  }

  const { url } = await ctx.imageExporter.exportMedia(entry)
  const widthPct = m.sizeHint ? Math.min(100, Math.round((m.sizeHint / 800) * 100)) : 100
  return `<img class="dh-inline-image" style="--dh-img-width:${widthPct}%" src="${url}" loading="lazy" alt="${escapeHtml(basename)}" />`
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
