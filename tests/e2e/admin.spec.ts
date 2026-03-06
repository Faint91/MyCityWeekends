import { test, expect } from '@playwright/test'

test('Admin Panel › can log in and see dashboard', async ({ page }) => {
  test.setTimeout(120_000)

  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD
  if (!email || !password)
    throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD')

  await page.goto('/admin', { waitUntil: 'domcontentloaded' })

  // Wait until either the login form OR the first-user setup form is present
  await page.waitForSelector(
    'input[name="email"], #field-email, input[name="confirm-password"], #field-confirm-password',
    { timeout: 60_000 },
  )

  const isFirstUser =
    (await page.locator('input[name="confirm-password"], #field-confirm-password').count()) > 0

  if (isFirstUser) {
    // first-user setup
    await page.locator('input[name="email"], #field-email').first().fill(email)
    await page.locator('input[name="password"], #field-password').first().fill(password)
    await page
      .locator('input[name="confirm-password"], #field-confirm-password')
      .first()
      .fill(password)

    // optional fields, only if present
    const first = page.locator('input[name="firstName"]')
    if (await first.count()) await first.first().fill('Admin')

    const last = page.locator('input[name="lastName"]')
    if (await last.count()) await last.first().fill('User')

    await page.getByRole('button', { name: /create|register|save|continue/i }).click()
  } else {
    // normal login
    await page.locator('input[name="email"], #field-email').first().fill(email)
    await page.locator('input[name="password"], #field-password').first().fill(password)
    await page.getByRole('button', { name: /log ?in/i }).click()
  }

  await expect(page.getByText(/dashboard/i)).toBeVisible({ timeout: 60_000 })
})
