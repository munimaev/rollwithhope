import type { SlugDict } from './types.js'

/** Убирает префикс "NN︱эмодзи︱" или "NN︱" из имени папки/файла хранилища. */
export function stripPrefix(name: string): string {
  return name.replace(/\.md$/, '').replace(/^\d+︱(?:[^︱]+︱)?/, '')
}

export class MissingSlugError extends Error {
  constructor(public segment: string) {
    super(`Нет перевода в Слаги.yml для сегмента: "${segment}"`)
  }
}

/**
 * Возвращает slug для сегмента пути. Приоритет: явный override (frontmatter slug:),
 * затем словарь Слаги.yml. Если ни того ни другого нет — кидает MissingSlugError
 * (сборка должна остановиться, а не угадывать транслитерацию).
 */
export function resolveSlug(
  rawSegmentName: string,
  slugs: SlugDict,
  override?: string | null,
): string {
  if (override) return override
  const key = stripPrefix(rawSegmentName)
  const slug = slugs[key]
  if (!slug) throw new MissingSlugError(key)
  return slug
}
