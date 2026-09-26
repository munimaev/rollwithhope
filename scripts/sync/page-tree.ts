import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { SectionConfig, ResolvedPage, SlugDict } from './types.js'
import { resolveSlug, stripPrefix } from './slug.js'

export interface PageSkeleton extends ResolvedPage {
  absPath: string
  bodyRaw: string
}


const publicDescendantCache = new Map<string, boolean>()
function hasPublicDescendant(absDir: string): boolean {
  if (publicDescendantCache.has(absDir)) return publicDescendantCache.get(absDir)!
  let result = false
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const abs = path.join(absDir, entry.name)
    if (entry.isDirectory()) {
      if (hasPublicDescendant(abs)) { result = true; break }
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'sortspec.md') {
      const raw = fs.readFileSync(abs, 'utf8')
      const parsed = matter(raw)
      if (parsed.data.visibility === 'public') { result = true; break }
    }
  }
  publicDescendantCache.set(absDir, result)
  return result
}

const KNOWN_LAYOUTS = new Set(['article', 'catalog', 'statblock'])

export function buildSectionPages(
  section: SectionConfig,
  vaultPath: string,
  slugs: SlugDict,
  warnings: string[],
): PageSkeleton[] {
  const pages: PageSkeleton[] = []
  const sectionRoot = path.join(vaultPath, section.vaultPath)

  function chapterOf(dirName: string): number {
    const m = /^(\d{2})/.exec(dirName)
    if (!m) return 0 // Appendix и прочее без числового префикса — нейтральная глава
    const n = Number(m[1])
    return n >= 1 && n <= 5 ? n : 0 // 00 Introduction -> 0
  }

  function walk(absDir: string, urlPrefix: string, idPrefix: string, parentId: string | null, sortKeyPrefix: string, chapter: number) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true }).filter((e) => !e.name.startsWith('.'))
    const hasSortspec = entries.some((e) => e.isFile() && e.name === 'sortspec.md')

    const dirs = entries.filter((e) => e.isDirectory())
    const files = entries.filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'sortspec.md' && e.name !== 'Index.md')
    const indexFile = entries.find((e) => e.isFile() && e.name === 'Index.md')

    // Своя страница этой папки (если есть Index.md и она публична)
    let ownId = idPrefix
    let ownUrl = urlPrefix
    let ownIndexIsPublic = false
    if (indexFile) {
      const abs = path.join(absDir, indexFile.name)
      const raw = fs.readFileSync(abs, 'utf8')
      const parsed = matter(raw)
      if (parsed.data.visibility === 'public') {
        ownIndexIsPublic = true
        pages.push(makePage({
          absPath: abs, urlPrefix, idPrefix, parentId, sortKeyPrefix, order: 0,
          section, slugs, warnings, raw: parsed, isIndex: true, chapter,
        }))
      }
    }
    // Папка без публичной Index.md (кроме корня раздела) — заводим виртуальный узел
    // чисто для группировки сайдбара, иначе дети reparent-ятся на несуществующую
    // страницу, становятся "сиротами" и расползаются плоским списком по корню
    // (см. CLAUDE.md, «Дерево сайдбара плоское»).
    const isSectionRoot = absDir === sectionRoot
    if (!ownIndexIsPublic && !isSectionRoot) {
      pages.push({
        id: ownId,
        url: null,
        sectionId: section.id,
        title: stripPrefix(path.basename(absDir)),
        layout: 'article',
        tags: [],
        original: null,
        vaultRelPath: '',
        isIndex: false,
        parentId,
        sortKey: sortKeyPrefix,
        chapter,
        banner: null,
        backlinks: [],
        isVirtual: true,
        absPath: '',
        bodyRaw: '',
      })
    }
    // Reparent-им детей на ownId, если у этой папки есть собственный узел в pages[]
    // (реальный Index или виртуальный группирующий) — иначе они остаются на parentId.
    const hasOwnNode = ownIndexIsPublic || !isSectionRoot

    const sortedFiles = hasSortspec
      ? [...files].sort((a, b) => stripPrefix(a.name).localeCompare(stripPrefix(b.name), 'ru'))
      : [...files].sort((a, b) => a.name.replace(/\.md$/, '').localeCompare(b.name.replace(/\.md$/, ''), 'en'))
    const sortedDirs = hasSortspec
      ? [...dirs].sort((a, b) => stripPrefix(a.name).localeCompare(stripPrefix(b.name), 'ru'))
      : [...dirs].sort((a, b) => a.name.localeCompare(b.name, 'en'))

    sortedFiles.forEach((f, i) => {
      const abs = path.join(absDir, f.name)
      const raw = fs.readFileSync(abs, 'utf8')
      const parsed = matter(raw)
      if (parsed.data.visibility !== 'public') return
      const slug = resolveSlug(f.name, slugs, parsed.data.slug as string | undefined)
      pages.push(makePage({
        absPath: abs,
        urlPrefix: `${ownUrl}/${slug}`,
        idPrefix: `${ownId}/${slug}`,
        parentId: hasOwnNode ? ownId : parentId,
        sortKeyPrefix: `${sortKeyPrefix}.${String(i).padStart(3, '0')}`,
        order: i,
        section, slugs, warnings, raw: parsed, isIndex: false, chapter,
      }))
    })

    sortedDirs.forEach((d, i) => {
      const abs = path.join(absDir, d.name)
      if (!hasPublicDescendant(abs)) return
      const slug = resolveSlug(d.name, slugs)
      const childChapter = absDir === sectionRoot ? chapterOf(d.name) : chapter
      walk(
        abs,
        `${ownUrl}/${slug}`,
        `${ownId}/${slug}`,
        hasOwnNode ? ownId : parentId,
        `${sortKeyPrefix}.d${String(i).padStart(3, '0')}`,
        childChapter,
      )
    })
  }

  walk(sectionRoot, section.urlPrefix, section.id, null, '', 0)
  return pages
}

function makePage(args: {
  absPath: string
  urlPrefix: string
  idPrefix: string
  parentId: string | null
  sortKeyPrefix: string
  order: number
  section: SectionConfig
  slugs: SlugDict
  warnings: string[]
  raw: matter.GrayMatterFile<string>
  isIndex: boolean
  chapter: number
}): PageSkeleton {
  const { absPath, urlPrefix, idPrefix, parentId, sortKeyPrefix, order, section, warnings, raw, isIndex, chapter } = args
  const fm = raw.data
  const layout = (fm.layout as string) ?? section.defaultLayout ?? 'article'
  if (!KNOWN_LAYOUTS.has(layout)) {
    throw new Error(`Неизвестный layout: "${layout}" (${absPath})`)
  }
  const title = (fm.name as string) ?? stripPrefix(path.basename(absPath))
  return {
    id: idPrefix,
    url: urlPrefix,
    sectionId: section.id,
    title,
    layout,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
    original: (fm.original as string) ?? null,
    vaultRelPath: '', // проставляется в index.ts (там известен vaultPath)
    isIndex,
    parentId,
    sortKey: sortKeyPrefix,
    chapter,
    banner: null,
    backlinks: [],
    isVirtual: false,
    absPath,
    bodyRaw: raw.content,
  } as PageSkeleton
}
