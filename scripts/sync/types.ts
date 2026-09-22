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
  url: string
  sectionId: string
  title: string
  layout: string
  tags: string[]
  original: string | null
  vaultRelPath: string
  isIndex: boolean
  parentId: string | null
  sortKey: string
  banner: string | null
  backlinks: string[]
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
