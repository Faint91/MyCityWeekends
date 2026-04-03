import { test, expect } from '@playwright/test'

test('Admin Panel › can log in and see dashboard', async ({ page }) => {
  test.setTimeout(120_000)

  await page.goto('/admin', { waitUntil: 'networkidle' })

  await expect(page).toHaveURL(/\/admin\/?$/)

  await expect(page.getByRole('heading', { name: 'MyCityWeekends admin' })).toBeVisible({
    timeout: 60_000,
  })
})
