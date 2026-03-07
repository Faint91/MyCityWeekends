import { test, expect } from '@playwright/test'

test('Event page shows friendly not-found', async ({ page }) => {
  await page.goto('/event/this-does-not-exist-2099-01-01')
  await expect(page.getByRole('heading', { name: /event not found/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /back to this weekend/i })).toBeVisible()
})
