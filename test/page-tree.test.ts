import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildSectionPages } from '../scripts/sync/page-tree.js'
import type { SectionConfig, SlugDict } from '../scripts/sync/types.js'

const tmpDirs: string[] = []

function makeTmpVault(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dh-vault-'))
  tmpDirs.push(dir)
  return dir
}

function write(vaultPath: string, relPath: string, frontmatter: Record<string, unknown>, body = 'Текст') {
  const abs = path.join(vaultPath, relPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')
  fs.writeFileSync(abs, `---\n${fm}\n---\n\n${body}\n`, 'utf8')
}

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!
    fs.rmSync(d, { recursive: true, force: true })
  }
})

const section: SectionConfig = {
  id: 'rules',
  title: 'Правила',
  vaultPath: 'Rules',
  urlPrefix: '/rules',
  color: '--dh-color-rules',
  defaultLayout: 'article',
}

const slugs: SlugDict = {
  'Intro': 'intro',
  'Leaf': 'leaf',
  'PublicSub': 'public-sub',
  'Child': 'child',
}

describe('buildSectionPages — дерево при приватных Index.md', () => {
  it('не создаёт "сирот": каждый parentId либо null, либо указывает на реально существующую страницу', () => {
    const vaultRoot = makeTmpVault()
    // Раздел: сама секция и подпапка "00︱Intro" имеют ЧАСТНЫЙ (private) Index.md —
    // они не публикуются как отдельные страницы. Корень раздела не заводит виртуальный
    // узел (он и так null-корень дерева), но "00︱Intro" — не корень, поэтому получает
    // виртуальный группирующий узел (isVirtual), и лист цепляется к нему, а не выпадает
    // плоским сиротой в корень (см. CLAUDE.md, «Дерево сайдбара плоское»).
    write(vaultRoot, 'Rules/Index.md', { visibility: 'private' })
    write(vaultRoot, 'Rules/00︱Intro/Index.md', { visibility: 'private' })
    write(vaultRoot, 'Rules/00︱Intro/01︱Leaf.md', { visibility: 'public' })

    const warnings: string[] = []
    const pages = buildSectionPages(section, vaultRoot, slugs, warnings)

    expect(pages).toHaveLength(2)
    const introGroup = pages.find((p) => p.isVirtual)
    const leaf = pages.find((p) => !p.isVirtual)
    expect(introGroup).toBeDefined()
    expect(leaf).toBeDefined()
    expect(leaf!.url).toBe('/rules/intro/leaf')
    expect(introGroup!.url).toBeNull()

    const idsInTree = new Set(pages.map((p) => p.id))
    for (const p of pages) {
      const parentExistsOrIsRoot = p.parentId === null || idsInTree.has(p.parentId)
      expect(parentExistsOrIsRoot).toBe(true)
    }
    // Виртуальная группа "00︱Intro" сама — прямой ребёнок корня (у Rules нет своего узла),
    // а лист прикреплён к виртуальной группе, а не болтается сиротой в корне.
    expect(introGroup!.parentId).toBeNull()
    expect(leaf!.parentId).toBe(introGroup!.id)
  })

  it('когда у папки есть публичный Index.md — дети корректно прикрепляются к нему', () => {
    const vaultRoot = makeTmpVault()
    write(vaultRoot, 'Rules/Index.md', { visibility: 'private' })
    write(vaultRoot, 'Rules/02︱PublicSub/Index.md', { visibility: 'public' })
    write(vaultRoot, 'Rules/02︱PublicSub/01︱Child.md', { visibility: 'public' })

    const warnings: string[] = []
    const pages = buildSectionPages(section, vaultRoot, slugs, warnings)

    const indexPage = pages.find((p) => p.isIndex)
    const childPage = pages.find((p) => !p.isIndex)
    expect(indexPage).toBeDefined()
    expect(childPage).toBeDefined()
    expect(childPage!.parentId).toBe(indexPage!.id)
  })
})
