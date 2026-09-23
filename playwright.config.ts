import { defineConfig, devices } from '@playwright/test'

/**
 * Минимальная конфигурация Playwright e2e для регрессионных тестов
 * на баги в браузерном поведении/вёрстке, которые не ловятся vitest-юнитами
 * (тот же repo-конвенции стиль, что и vitest.config.ts — тесты рядом,
 * отдельная команда npm run test:e2e).
 *
 * webServer сначала собирает прод-сборку (тот же SITE_BASE=/rollwithhope/,
 * что и на GitHub Pages, см. vite.config.ts) и поднимает её через
 * `vite preview` — это важно для багов, завязанных именно на deploy base
 * (см. e2e/navigation.spec.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/rollwithhope/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/rollwithhope/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
