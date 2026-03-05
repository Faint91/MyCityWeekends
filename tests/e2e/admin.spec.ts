import { test, expect } from '@playwright/test'

test('Admin Panel › can log in and see dashboard', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD')
  }

  await page.goto('/admin')

  // If DB is fresh, Payload shows a "create first user" / "set password" form
  const confirmPassword = page.locator('input[name="confirm-password"]')

  if (await confirmPassword.count()) {
    // Create first admin user flow
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await confirmPassword.fill(password)

    // Some templates ask for name fields; fill if present
    const firstName = page.locator('input[name="firstName"]')
    if (await firstName.count()) await firstName.fill('Admin')

    const lastName = page.locator('input[name="lastName"]')
    if (await lastName.count()) await lastName.fill('User')

    // Button text varies; this covers common cases
    await page.getByRole('button', { name: /create|register|save|continue/i }).click()
  } else {
    // Normal login flow
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.getByRole('button', { name: /log ?in/i }).click()
  }

  // Assert we're authenticated
  await expect(page.getByText(/dashboard/i)).toBeVisible()
})
