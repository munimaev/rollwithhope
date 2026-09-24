import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const IMAGES_DIR_NAME = '90︱🗂️︱Изображения'

/** Папки (относительно 90︱🗂️︱Изображения), которые пока НЕ публикуются —
 * карты и баннеры классов. Звериные формы друида (Cards/Beastform) — НЕ исключение,
 * это доменная механика, а не часть закрытого баннера класса. */
const EXCLUDED_PREFIXES = ['Banners/Class', 'Banners/Subclasses', 'Cards/Classes']

export interface ImageEntry {
  absPath: string
  /** путь относительно 90︱🗂️︱Изображения, например "Cards/Domains/Bone/card-bone-1.webp" */
  relPath: string
  isCard: boolean
  excluded: boolean
}

export function indexImages(vaultPath: string): Map<string, ImageEntry[]> {
  const root = path.join(vaultPath, IMAGES_DIR_NAME)
  const byBasename = new Map<string, ImageEntry[]>()

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
      } else if (entry.isFile()) {
        const relPath = path.relative(root, abs).split(path.sep).join('/')
        const isCard = relPath.startsWith('Cards/')
        const excluded = EXCLUDED_PREFIXES.some((p) => relPath.startsWith(p + '/'))
        const arr = byBasename.get(entry.name) ?? []
        arr.push({ absPath: abs, relPath, isCard, excluded })
        byBasename.set(entry.name, arr)
      }
    }
  }
  if (fs.existsSync(root)) walk(root)
  return byBasename
}

export class ImageExporter {
  private cardCache = new Map<string, string>() // absPath -> output relPath (public/images/...)
  private mediaCache = new Map<string, string>()

  /** outDir — папка public/ (не content/!): картинки — статика, отдаётся как есть, без
   * обработки Vite; content/pages/**\/*.vue — настоящие SFC, и относительный src там
   * Vite попытался бы резолвить как модуль-импорт. base — префикс сайта (SITE_BASE,
   * по умолчанию "/rollwithhope/"), запекается в URL на этапе sync, т.к. src в шаблоне —
   * статическая строка, не может прочитать import.meta.env.BASE_URL в рантайме. */
  constructor(private outDir: string, private base: string) {
    fs.mkdirSync(path.join(outDir, 'images', 'cards'), { recursive: true })
    fs.mkdirSync(path.join(outDir, 'images', 'media'), { recursive: true })
  }

  /** Карточка: два файла — 330px (быстрая загрузка списков/страниц с множеством карт,
   * используется как <img src>) и 660px (полноразмерный превью в лайтбоксе при клике,
   * используется как data-full). Оба — WebP q85, пережаты из оригинала независимо
   * (не апскейл друг из друга), чтобы 330px не терял резкость из-за двойного ресемплинга. */
  async exportCard(entry: ImageEntry): Promise<{ url330: string; url660: string; width: number; height: number }> {
    const hash = fileTag(entry.absPath)
    const out330Rel = `images/cards/${hash}-330.webp`
    const out660Rel = `images/cards/${hash}-660.webp`
    const out330Abs = path.join(this.outDir, out330Rel)
    const out660Abs = path.join(this.outDir, out660Rel)

    if (!fs.existsSync(out660Abs)) {
      const meta = await sharp(entry.absPath).metadata()
      const targetW = Math.min(660, meta.width ?? 660)
      await sharp(entry.absPath).resize({ width: targetW }).webp({ quality: 85 }).toFile(out660Abs)
    }
    if (!fs.existsSync(out330Abs)) {
      const meta = await sharp(entry.absPath).metadata()
      const targetW = Math.min(330, meta.width ?? 330)
      await sharp(entry.absPath).resize({ width: targetW }).webp({ quality: 85 }).toFile(out330Abs)
    }

    const meta660 = await sharp(out660Abs).metadata()
    return { url330: this.base + out330Rel, url660: this.base + out660Rel, width: meta660.width ?? 660, height: meta660.height ?? 922 }
  }

  /** Баннер/иллюстрация: копия с пережатием в WebP q85, ограничение по ширине 1600px
   * (чтобы не тащить на сайт исходники по несколько МБ), исходные пропорции сохраняются. */
  async exportMedia(entry: ImageEntry): Promise<{ url: string; width: number; height: number }> {
    const hash = fileTag(entry.absPath)
    const outName = `${hash}.webp`
    const outRel = `images/media/${outName}`
    const outAbs = path.join(this.outDir, outRel)
    if (!fs.existsSync(outAbs)) {
      const img = sharp(entry.absPath)
      const meta = await img.metadata()
      const targetW = Math.min(1600, meta.width ?? 1600)
      await img.resize({ width: targetW, withoutEnlargement: true }).webp({ quality: 85 }).toFile(outAbs)
    }
    const meta = await sharp(outAbs).metadata()
    return { url: this.base + outRel, width: meta.width ?? 0, height: meta.height ?? 0 }
  }

  /** Пропорции оригинала — для плейсхолдера исключённой картинки (не публикуем сам файл,
   * но верстаем плейсхолдер той же формы). */
  async originalAspect(entry: ImageEntry): Promise<{ width: number; height: number }> {
    const meta = await sharp(entry.absPath).metadata()
    return { width: meta.width ?? 720, height: meta.height ?? 1007 }
  }
}

function fileTag(absPath: string): string {
  // Короткий стабильный идентификатор файла для имени выходного файла:
  // basename без расширения + хэш полного пути (на случай одинаковых имён в разных папках).
  const base = path.basename(absPath).replace(/\.[^.]+$/, '')
  let h = 0
  for (const ch of absPath) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `${base}-${h.toString(36)}`
}

export { EXCLUDED_PREFIXES }
