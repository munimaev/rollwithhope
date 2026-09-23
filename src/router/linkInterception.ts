/**
 * Внутренние ссылки в приложении (топ-нав, дерево разделов, хлебные крошки,
 * пред/след, обратные ссылки, и — что важнее всего — ссылки внутри содержимого
 * статей, вставляемого через v-html) — это обычные `<a href="/rules/...">`
 * с путями БЕЗ учёта base деплоя. На GitHub Pages сайт живёт в подпапке
 * (`/rollwithhope/`), поэтому обычный переход браузера по такому href ведёт на
 * `https://<host>/rules/...` вместо `https://<host>/rollwithhope/rules/...`
 * и получает 404 ("Site not found" / "Page not found" от GitHub Pages).
 *
 * `router.push()` с этим же href, наоборот, корректно учитывает base
 * (см. `base: import.meta.env.BASE_URL` в src/main.ts). Поэтому вместо того,
 * чтобы переписывать href на каждой ссылке (включая те, что генерируются из
 * markdown при синке), приложение глобально перехватывает клики по внутренним
 * ссылкам и отдаёт их роутеру — см. App.vue.
 */

export function resolveInternalPath(href: string | null | undefined): string | null {
  if (!href) return null
  // внешние абсолютные URL (со схемой, напр. https:, mailto:, tel:) — не трогаем
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null
  // protocol-relative ("//example.com/...") — тоже внешняя ссылка
  if (href.startsWith('//')) return null
  // якоря на этой же странице (TOC "На этой странице") — пусть браузер сам скроллит
  if (href.startsWith('#')) return null
  // всё остальное в приложении — корень-относительные пути вида "/rules/..."
  if (!href.startsWith('/')) return null
  return href
}

export interface ClickModifiers {
  defaultPrevented: boolean
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export interface AnchorLike {
  target?: string | null
  hasDownload?: boolean
}

/**
 * Возвращает путь для router.push(), если клик нужно перехватить,
 * иначе null (тогда браузер должен обработать переход как обычно —
 * например, открытие в новой вкладке через Cmd/Ctrl+клик, внешние ссылки,
 * ссылки с target="_blank", download-ссылки, клик не левой кнопкой и т.п.)
 */
export function shouldInterceptClick(
  e: ClickModifiers,
  anchor: AnchorLike | null,
  href: string | null | undefined,
): string | null {
  if (!anchor) return null
  if (e.defaultPrevented) return null
  if (e.button !== 0) return null
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return null
  if (anchor.hasDownload) return null
  return resolveInternalPath(href)
}
