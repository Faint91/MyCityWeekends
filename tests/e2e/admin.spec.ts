import { test, expect } from '@playwright/test'

test('Admin Panel › can log in and see dashboard', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD
  if (!email || !password)
    throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD')

  await page.goto('/admin')

  const confirm = page.locator('input[name="confirm-password"]')

  if (await confirm.count()) {
    // first-user setup screen
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await confirm.fill(password)

    const first = page.locator('input[name="firstName"]')
    if (await first.count()) await first.fill('Admin')

    const last = page.locator('input[name="lastName"]')
    if (await last.count()) await last.fill('User')

    await page.getByRole('button', { name: /create|register|save|continue/i }).click()
  } else {
    // normal login screen
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.getByRole('button', { name: /log ?in/i }).click()
  }

  await expect(page.getByText(/dashboard/i)).toBeVisible()
})
