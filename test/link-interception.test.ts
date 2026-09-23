import { describe, it, expect } from 'vitest'
import { resolveInternalPath, shouldInterceptClick, type ClickModifiers } from '../src/router/linkInterception.js'

const plainClick: ClickModifiers = {
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
}

describe('resolveInternalPath', () => {
  it('пропускает корень-относительный путь как есть', () => {
    expect(resolveInternalPath('/rules/introduction/what-is-this')).toBe('/rules/introduction/what-is-this')
  })

  it('не трогает внешние ссылки (со схемой)', () => {
    expect(resolveInternalPath('https://www.daggerheart.com/srd/')).toBeNull()
    expect(resolveInternalPath('mailto:test@example.com')).toBeNull()
  })

  it('не трогает protocol-relative ссылки', () => {
    expect(resolveInternalPath('//example.com/x')).toBeNull()
  })

  it('не трогает якоря на этой же странице (TOC)', () => {
    expect(resolveInternalPath('#some-heading')).toBeNull()
  })

  it('не трогает относительные пути без ведущего слеша', () => {
    expect(resolveInternalPath('rules/x')).toBeNull()
  })

  it('null/undefined -> null', () => {
    expect(resolveInternalPath(null)).toBeNull()
    expect(resolveInternalPath(undefined)).toBeNull()
    expect(resolveInternalPath('')).toBeNull()
  })
})

describe('shouldInterceptClick', () => {
  it('перехватывает обычный левый клик по внутренней ссылке', () => {
    expect(shouldInterceptClick(plainClick, {}, '/rules/foo')).toBe('/rules/foo')
  })

  it('не перехватывает клик с Cmd/Ctrl (открытие в новой вкладке)', () => {
    expect(shouldInterceptClick({ ...plainClick, metaKey: true }, {}, '/rules/foo')).toBeNull()
    expect(shouldInterceptClick({ ...plainClick, ctrlKey: true }, {}, '/rules/foo')).toBeNull()
  })

  it('не перехватывает клик правой/средней кнопкой', () => {
    expect(shouldInterceptClick({ ...plainClick, button: 1 }, {}, '/rules/foo')).toBeNull()
    expect(shouldInterceptClick({ ...plainClick, button: 2 }, {}, '/rules/foo')).toBeNull()
  })

  it('не перехватывает ссылки с target="_blank"', () => {
    expect(shouldInterceptClick(plainClick, { target: '_blank' }, '/rules/foo')).toBeNull()
  })

  it('не перехватывает download-ссылки', () => {
    expect(shouldInterceptClick(plainClick, { hasDownload: true }, '/rules/foo')).toBeNull()
  })

  it('не перехватывает, если событие уже preventDefault()-нуто', () => {
    expect(shouldInterceptClick({ ...plainClick, defaultPrevented: true }, {}, '/rules/foo')).toBeNull()
  })

  it('не перехватывает внешние ссылки даже с обычным левым кликом', () => {
    expect(shouldInterceptClick(plainClick, {}, 'https://example.com')).toBeNull()
  })

  it('без anchor -> null', () => {
    expect(shouldInterceptClick(plainClick, null, '/rules/foo')).toBeNull()
  })
})
