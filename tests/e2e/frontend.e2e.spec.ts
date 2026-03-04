import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('can load homepage', async ({ page }) => {
    await page.goto('/') // uses baseURL from playwright.config.ts
    await expect(page).toHaveTitle(/MyCityWeekends/i)

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toHaveText('This weekend in Vancouver')
  })
})
