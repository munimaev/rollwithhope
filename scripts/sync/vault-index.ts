import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface VaultNote {
  absPath: string
  /** путь относительно корня хранилища, POSIX-разделители, с оригинальными NN︱эмодзи︱ префиксами */
  vaultRelPath: string
  /** basename без .md, как в имени файла (может содержать "Класс — Способность") */
  basename: string
  isPublic: boolean
  frontmatter: Record<string, unknown>
  bodyRaw: string
}

const SKIP_DIRS = new Set([
  '.obsidian', '.git', '_to_delete', '93︱⏱️︱Временные файлы', 'Временные файлы',
])

/** Обходит ВСЁ хранилище (не только раздел «Правила») — нужно, чтобы резолвить
 * вики-ссылки на любые заметки, включая приватные/из других разделов. */
export function walkVault(vaultPath: string): VaultNote[] {
  const notes: VaultNote[] = []

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walk(abs)
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'sortspec.md') {
        const raw = fs.readFileSync(abs, 'utf8')
        const parsed = matter(raw)
        const vaultRelPath = path.relative(vaultPath, abs).split(path.sep).join('/')
        const basename = entry.name.replace(/\.md$/, '')
        const isPublic = parsed.data.visibility === 'public'
        notes.push({
          absPath: abs,
          vaultRelPath,
          basename,
          isPublic,
          frontmatter: parsed.data,
          bodyRaw: parsed.content,
        })
      }
    }
  }

  walk(vaultPath)
  return notes
}

export class VaultIndex {
  private byBasename = new Map<string, VaultNote[]>()
  private byRelPath = new Map<string, VaultNote>()

  constructor(public notes: VaultNote[]) {
    for (const n of notes) {
      this.byRelPath.set(n.vaultRelPath, n)
      const arr = this.byBasename.get(n.basename) ?? []
      arr.push(n)
      this.byBasename.set(n.basename, arr)
    }
  }

  /** Резолвит цель вики-ссылки/эмбеда (как в [[Цель]] или [[Папка/Цель]]) в заметку.
   * Стратегия как у Obsidian: если цель содержит "/" — ищем по суффиксу полного пути,
   * иначе — по basename (при неоднозначности берём первую и не падаем — на реальных
   * данных хранилища дублей не было). */
  resolve(target: string): VaultNote | null {
    const clean = target.trim()
    if (clean.includes('/')) {
      const bySuffix = [...this.byRelPath.values()].filter((n) =>
        n.vaultRelPath.endsWith(clean + '.md'),
      )
      if (bySuffix.length > 0) return bySuffix[0]
      // возможно указали путь без "01︱📚︱Правила/" и т.п. — падаем на basename ниже
    }
    const base = clean.split('/').pop()!
    const candidates = this.byBasename.get(base)
    if (!candidates || candidates.length === 0) return null
    return candidates[0]
  }
}
