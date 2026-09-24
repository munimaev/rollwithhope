import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from './config.js'
import { walkVault, VaultIndex } from './vault-index.js'
import { indexImages, ImageExporter } from './images.js'
import { buildSectionPages, type PageSkeleton } from './page-tree.js'
import { renderMarkdown } from './markdown/pipeline.js'
import { extractBannerEmbed } from './markdown/wikisyntax.js'
import type { Manifest, ResolvedPage } from './types.js'

async function main() {
  const strict = process.argv.includes('--strict')
  const vaultPath = process.env.VAULT_PATH
  if (!vaultPath || !fs.existsSync(vaultPath)) {
    console.error('VAULT_PATH не задан или не существует. Пример: VAULT_PATH="$HOME/mnt/DaggerHeart" npm run sync')
    process.exit(1)
  }

  const outDir = path.resolve('content')
  fs.mkdirSync(path.join(outDir, 'pages'), { recursive: true })
  // Картинки — в public/, не в content/: это статика, Vite копирует public/ в dist/ как
  // есть и не пытается резолвить src внутри .vue-шаблонов, начинающийся с "/" (см. images.ts).
  const publicDir = path.resolve('public')
  const siteBase = process.env.SITE_BASE ?? '/rollwithhope/'

  const config = loadConfig(vaultPath)
  console.log(`Разделов в конфиге: ${config.sections.length}, записей в словаре слагов: ${Object.keys(config.slugs).length}`)

  const warnings: string[] = []

  // --- индекс всего хранилища (для резолва вики-ссылок куда угодно) ---
  const allNotes = walkVault(vaultPath)
  const vaultIndex = new VaultIndex(allNotes)
  console.log(`Всего заметок в хранилище: ${allNotes.length}`)

  // --- проход 1: дерево страниц по всем разделам (без рендера тела) ---
  let allPages: PageSkeleton[] = []
  for (const section of config.sections) {
    const pages = buildSectionPages(section, vaultPath, config.slugs, warnings)
    for (const p of pages) {
      if (!p.isVirtual) p.vaultRelPath = path.relative(vaultPath, p.absPath).split(path.sep).join('/')
    }
    allPages = allPages.concat(pages)
  }
  console.log(`Публичных страниц к сборке: ${allPages.length}`)

  const urlMap = new Map<string, string>()
  for (const p of allPages) if (p.url) urlMap.set(p.vaultRelPath, p.url)

  const tagLists = new Map<string, { url: string; title: string }[]>()
  for (const tag of ['ancestry', 'community']) {
    tagLists.set(
      tag,
      allPages
        .filter((p) => p.tags.includes(tag) && p.url)
        .map((p) => ({ url: p.url as string, title: p.title })),
    )
  }

  // --- картинки ---
  const imageIndex = indexImages(vaultPath)
  const imageExporter = new ImageExporter(publicDir, siteBase)

  // --- проход 2: рендер тела каждой страницы ---
  const backlinks = new Map<string, Set<string>>()
  const changed: string[] = []
  const added: string[] = []

  for (const page of allPages) {
    if (page.isVirtual) continue // группирующий узел сайдбара — нет тела, нет .vue-файла

    const outFile = path.join(outDir, 'pages', `${page.id}.vue`)
    const existed = fs.existsSync(outFile)

    // Баннер: первая строка тела — вставка картинки -> в .hero, не в тело статьи
    // (см. templates/guidelines/40-markup-contract.md).
    let bodyForRender = page.bodyRaw
    const bannerMatch = extractBannerEmbed(page.bodyRaw, imageIndex)
    if (bannerMatch) {
      const { url } = await imageExporter.exportMedia(bannerMatch.entry)
      page.banner = url
      bodyForRender = bannerMatch.rest
    }

    let html: string
    try {
      html = await renderMarkdown(bodyForRender, {
        vaultIndex,
        urlMap,
        imageIndex,
        imageExporter,
        currentUrl: page.url!,
        warnings,
        backlinks,
        tagLists,
        siteBase,
      })
    } catch (e) {
      console.error(`\n✗ Ошибка при сборке "${page.vaultRelPath}":`)
      console.error((e as Error).message)
      process.exit(1)
    }

    // content/pages/**/*.vue — настоящий SFC, не строка HTML (решение 2026-09-23, см. CLAUDE.md).
    // <template> — просто семантический HTML из renderMarkdown, без директив Vue.
    // data-chapter/data-section — цвет главы/раздела (см. src/styles/base.css), каскадом на .marker и др.
    const vueSfc = `<template>\n<div class="prose" data-chapter="${page.chapter}" data-section="${page.sectionId}">\n${html}\n</div>\n</template>\n`

    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    const prev = existed ? fs.readFileSync(outFile, 'utf8') : null
    if (prev !== vueSfc) {
      fs.writeFileSync(outFile, vueSfc, 'utf8')
      ;(existed ? changed : added).push(page.url!)
    }
  }

  // --- пропавшие страницы (были в content/pages, а теперь не публичны) ---
  const removed: string[] = []
  const currentIds = new Set(allPages.map((p) => p.id))
  function pruneRemoved(dir: string, idPrefix: string) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const id = idPrefix ? `${idPrefix}/${entry.name.replace(/\.vue$/, '')}` : entry.name.replace(/\.vue$/, '')
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        pruneRemoved(abs, id)
        if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs)
      } else if (entry.isFile() && entry.name.endsWith('.vue')) {
        if (!currentIds.has(id)) {
          fs.unlinkSync(abs)
          removed.push(id)
        }
      }
    }
  }
  pruneRemoved(path.join(outDir, 'pages'), '')

  // --- backlinks + сериализация манифеста ---
  const pagesOut: ResolvedPage[] = allPages.map((p) => ({
    id: p.id,
    url: p.url,
    sectionId: p.sectionId,
    title: p.title,
    layout: p.layout,
    tags: p.tags,
    original: p.original,
    vaultRelPath: p.vaultRelPath,
    isIndex: p.isIndex,
    parentId: p.parentId,
    sortKey: p.sortKey,
    chapter: p.chapter,
    banner: p.banner,
    backlinks: p.url ? [...(backlinks.get(p.url) ?? [])] : [],
    isVirtual: p.isVirtual,
  }))

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    sections: config.sections.map((s) => ({ id: s.id, title: s.title, urlPrefix: s.urlPrefix, color: s.color })),
    pages: pagesOut,
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  // --- отчёт ---
  console.log('\n--- Отчёт sync ---')
  console.log(`Добавлено: ${added.length}`)
  console.log(`Изменено: ${changed.length}`)
  console.log(`Убрано: ${removed.length}`)
  console.log(`Предупреждений: ${warnings.length}`)
  for (const w of warnings.slice(0, 50)) console.log(`  ⚠ ${w}`)
  if (warnings.length > 50) console.log(`  … и ещё ${warnings.length - 50}`)

  if (strict && warnings.length > 0) {
    console.error('\n--strict: есть предупреждения, сборка остановлена.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
