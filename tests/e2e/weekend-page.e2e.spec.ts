import { test, expect } from '@playwright/test'

test('Weekend page works with or without data', async ({ page }) => {
  await page.goto('/')

  const eventLinks = page.locator('a[href^="/event/"]')

  if ((await eventLinks.count()) > 0) {
    await eventLinks.first().click()
    await expect(page).toHaveURL(/\/event\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    return
  }

  // Accept either:
  // 1) no weekend drop
  // 2) weekend drop exists but no top3 items
  const empty1 = page.getByText(/no weekend drop published yet/i)
  const empty2 = page.getByText(/no top 3 items yet/i)

  await expect(empty1.or(empty2)).toBeVisible()
})
