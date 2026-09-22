import { describe, it, expect } from 'vitest'
import { extractWikiTokens, applyWikiTokens } from '../scripts/sync/markdown/wikisyntax.js'

describe('extractWikiTokens', () => {
  it('находит обычную вики-ссылку с алиасом', () => {
    const { matches } = extractWikiTokens('см. [[Страх|страху]] персонажей')
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ kind: 'link', target: 'Страх', alias: 'страху' })
  })

  it('находит эмбед картинки с размером', () => {
    const { matches } = extractWikiTokens('![[card-bone-1.webp|330]]')
    expect(matches[0]).toMatchObject({ kind: 'embed', target: 'card-bone-1.webp', sizeHint: 330 })
  })

  it('убирает экранирующий бэкслеш перед пайпом внутри таблицы', () => {
    const { matches } = extractWikiTokens('| ![[card.webp\\|330]] |')
    expect(matches[0].target).toBe('card.webp')
    expect(matches[0].sizeHint).toBe(330)
  })

  it('не путает эмбед и обычную ссылку рядом', () => {
    const { matches } = extractWikiTokens('![[img.webp]] и [[Заметка]]')
    expect(matches.map((m) => m.kind)).toEqual(['embed', 'link'])
  })

  it('applyWikiTokens подставляет разрешённый html обратно', () => {
    const { tokenized, matches } = extractWikiTokens('[[Страх]]')
    const map = new Map([[matches[0].token, '<a href="/rules/fear">Страх</a>']])
    expect(applyWikiTokens(tokenized, map)).toBe('<a href="/rules/fear">Страх</a>')
  })
})
