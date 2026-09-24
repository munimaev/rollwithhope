export interface SectionConfig {
  id: string
  title: string
  vaultPath: string
  urlPrefix: string
  color: string
  defaultLayout: string
}

export interface SlugDict {
  [russianSegment: string]: string
}

export interface VaultNoteRef {
  /** Абсолютный путь к .md файлу в хранилище */
  absPath: string
  /** Путь относительно корня хранилища */
  vaultRelPath: string
  /** Имя файла без расширения, как есть (для резолва вики-ссылок по basename) */
  basename: string
  isPublic: boolean
  frontmatter: Record<string, unknown>
}

export interface ResolvedPage {
  id: string
  /** null для виртуальных узлов-папок — см. isVirtual */
  url: string | null
  sectionId: string
  title: string
  layout: string
  tags: string[]
  original: string | null
  vaultRelPath: string
  isIndex: boolean
  parentId: string | null
  sortKey: string
  /** 0 — нейтральный (Introduction/Appendix), 1–5 — цвет главы книги (по префиксу пути в хранилище). */
  chapter: number
  banner: string | null
  backlinks: string[]
  /**
   * Папка хранилища без публичной Index.md, но с публичными потомками — синтетический
   * узел только для группировки сайдбара (нет собственного контента/URL/файла .vue).
   * См. CLAUDE.md, «Дерево сайдбара плоское».
   */
  isVirtual: boolean
}

export interface Manifest {
  generatedAt: string
  sections: Array<Pick<SectionConfig, 'id' | 'title' | 'urlPrefix' | 'color'>>
  pages: ResolvedPage[]
}

export interface ImageIndexEntry {
  absPath: string
  vaultRelPath: string
  /** путь относительно "90︱🗂️︱Изображения" — используется для проверки исключений и категории */
  imagesRelPath: string
}

export interface SyncReport {
  added: string[]
  changed: string[]
  removed: string[]
  warnings: string[]
  excludedImages: number
}
