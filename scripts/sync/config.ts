import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import type { SectionConfig, SlugDict } from './types.js'

export interface SyncConfig {
  vaultPath: string
  siteDir: string
  sections: SectionConfig[]
  slugs: SlugDict
}

export function loadConfig(vaultPath: string): SyncConfig {
  const siteDir = path.join(vaultPath, '96︱🛠️︱Сайт')

  const sectionsRaw = yaml.load(
    fs.readFileSync(path.join(siteDir, 'Разделы.yml'), 'utf8'),
  ) as { sections: SectionConfig[] }

  const slugs = yaml.load(
    fs.readFileSync(path.join(siteDir, 'Слаги.yml'), 'utf8'),
  ) as SlugDict

  return {
    vaultPath,
    siteDir,
    sections: sectionsRaw.sections,
    slugs,
  }
}
