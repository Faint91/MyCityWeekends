import { test, expect } from '@playwright/test'

test('Weekend page works with or without data', async ({ page }) => {
  await page.goto('/')

  const eventLinks = page.locator('a[href^="/event/"]')

  if ((await eventLinks.count()) > 0) {
    await Promise.all([
      page.waitForURL(/\/event\//, { timeout: 15000 }),
      eventLinks.first().click(),
    ])
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    return
  }

  await expect(
    page.getByRole('heading', {
      name: /new events will be coming next tuesday night!/i,
    }),
  ).toBeVisible()
})
