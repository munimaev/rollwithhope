import { describe, it, expect } from 'vitest'
import { stripPrefix, resolveSlug, MissingSlugError } from '../scripts/sync/slug.js'

describe('stripPrefix', () => {
  it('убирает номер и эмодзи', () => {
    expect(stripPrefix('03︱📓︱Создавая приключение')).toBe('Создавая приключение')
  })
  it('убирает номер без эмодзи и расширение .md', () => {
    expect(stripPrefix('02︱Шаг 1. Выберите атрибут.md')).toBe('Шаг 1. Выберите атрибут')
  })
  it('не трогает имя без префикса', () => {
    expect(stripPrefix('Воин — Зов Резни.md')).toBe('Воин — Зов Резни')
  })
})

describe('resolveSlug', () => {
  const slugs = { 'Страх': 'fear' }

  it('берёт значение из словаря', () => {
    expect(resolveSlug('10︱Страх.md', slugs)).toBe('fear')
  })
  it('override из frontmatter приоритетнее словаря', () => {
    expect(resolveSlug('10︱Страх.md', slugs, 'custom-slug')).toBe('custom-slug')
  })
  it('кидает MissingSlugError, если сегмента нет ни в override, ни в словаре', () => {
    expect(() => resolveSlug('99︱Неизвестное название.md', slugs)).toThrow(MissingSlugError)
  })
})
