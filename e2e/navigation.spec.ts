import { test, expect } from '@playwright/test'

/**
 * Регрессионные e2e-тесты на баг с "битой" внутренней навигацией.
 *
 * Ссылки в приложении (топ-нав, дерево разделов, хлебные крошки, пред/след,
 * обратные ссылки, ссылки внутри контента статей из v-html) — обычные
 * <a href="/rules/..."> с путями БЕЗ учёта base пути деплоя. На GitHub Pages
 * сайт живёт в подпапке /rollwithhope/, поэтому обычный переход браузера по
 * такому href вёл на https://.../rules/... вместо .../rollwithhope/rules/...
 * и получал 404 ("Site not found" / "Page not found" от GitHub Pages).
 *
 * Фикс — глобальный перехват кликов по внутренним ссылкам в App.vue
 * (router.push() вместо обычной навигации браузера, которая base не знает).
 * См. src/router/linkInterception.ts и src/App.vue.
 *
 * Локальная prod-подобная сборка (playwright.config.ts собирает с тем же
 * SITE_BASE=/rollwithhope/, что и GitHub Pages) воспроизводит эту же
 * проблему 1-в-1, поэтому баг ловится и здесь, а не только на проде.
 */

test.describe('внутренняя навигация', () => {
  test('пред/след ссылка на статье — клиентский переход, без 404', async ({ page }) => {
    await page.goto('/rules/introduction/the-basics')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Basics')

    const next = page.getByRole('link', { name: /What Is This/ })
    await expect(next).toBeVisible()
    await next.click()

    await expect(page).toHaveURL(/\/rollwithhope\/rules\/introduction\/what-is-this/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What Is This')
    await expect(page.locator('body')).not.toContainText('Page not found')
    await expect(page.locator('body')).not.toContainText('Site not found')
  })

  test('хлебные крошки ведут на реальный контент, а не на 404', async ({ page }) => {
    await page.goto('/rules/introduction/what-is-this')
    const crumbLink = page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link').first()
    await expect(crumbLink).toBeVisible()
    await crumbLink.click()

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Page not found')
    await expect(page.locator('body')).not.toContainText('Site not found')
  })

  test('дерево разделов слева не пустое и ссылки в нём кликабельны', async ({ page }) => {
    await page.goto('/rules/introduction/the-basics')
    const tree = page.getByRole('navigation', { name: 'Оглавление раздела' })
    const links = tree.getByRole('link')

    // Регрессия: из-за неверного reparent-инга в page-tree.ts дети приватных
    // Index.md становились "сиротами" и дерево оказывалось пустым.
    expect(await links.count()).toBeGreaterThan(0)

    await links.first().click()
    await expect(page.locator('body')).not.toContainText('Page not found')
    await expect(page.locator('body')).not.toContainText('Site not found')
  })

  test('клик по ссылке с Cmd/Ctrl не перехватывается роутером (открытие в новой вкладке)', async ({ page, context }) => {
    await page.goto('/rules/introduction/the-basics')
    const next = page.getByRole('link', { name: /What Is This/ })

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      next.click({ modifiers: ['ControlOrMeta'] }),
    ])
    await popup.waitForLoadState()
    expect(popup.url()).toContain('/rollwithhope/rules/introduction/what-is-this')
    // исходная вкладка не должна была перейти
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Basics')
    await popup.close()
  })
})
