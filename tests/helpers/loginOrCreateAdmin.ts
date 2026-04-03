import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const ADMIN_ROOT_PATH = '/admin'

async function submitLoginForm(page: Page, email: string, password: string): Promise<void> {
  await page.waitForSelector('input[name="email"], #field-email', { timeout: 60_000 })
  await page.waitForSelector('input[name="password"], #field-password', { timeout: 60_000 })

  await page.locator('input[name="email"], #field-email').first().fill(email)
  await page.locator('input[name="password"], #field-password').first().fill(password)

  const loginButton = page.getByRole('button', { name: /log ?in/i })
  await expect(loginButton).toBeEnabled({ timeout: 60_000 })

  await Promise.all([
    page.waitForURL((url) => url.pathname === ADMIN_ROOT_PATH, {
      timeout: 60_000,
    }),
    loginButton.click(),
  ])

  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/admin\/?$/)
}

export async function loginOrCreateAdmin(page: Page): Promise<void> {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD')
  }

  await page.goto(ADMIN_ROOT_PATH, { waitUntil: 'networkidle' })

  await page.waitForSelector(
    'input[name="email"], #field-email, input[name="confirm-password"], #field-confirm-password',
    { timeout: 60_000 },
  )

  const isFirstUser =
    (await page.locator('input[name="confirm-password"], #field-confirm-password').count()) > 0

  if (isFirstUser) {
    await page.locator('input[name="email"], #field-email').first().fill(email)
    await page.locator('input[name="password"], #field-password').first().fill(password)
    await page
      .locator('input[name="confirm-password"], #field-confirm-password')
      .first()
      .fill(password)

    const first = page.locator('input[name="firstName"]')
    if (await first.count()) {
      await first.first().fill('Admin')
    }

    const last = page.locator('input[name="lastName"]')
    if (await last.count()) {
      await last.first().fill('User')
    }

    const createButton = page.getByRole('button', { name: /create|register|save|continue/i })
    await expect(createButton).toBeEnabled({ timeout: 60_000 })
    await createButton.click()

    const postCreateLoginButton = page.getByRole('button', { name: /log ?in/i })
    await page.waitForSelector('input[name="email"], #field-email', { timeout: 60_000 })
    await page.waitForSelector('input[name="password"], #field-password', { timeout: 60_000 })
    await expect(postCreateLoginButton).toBeEnabled({ timeout: 60_000 })
    await postCreateLoginButton.click()

    await page.waitForURL((url) => /\/admin\/login(?:\?|$)/.test(url.pathname + url.search), {
      timeout: 60_000,
    })
  }

  await submitLoginForm(page, email, password)

  // Prove the session works on a protected page before returning
  await page.goto('/admin/collections/candidate-events', { waitUntil: 'networkidle' })

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 60_000 })
    .toBe('/admin/collections/candidate-events')

  await expect(page).not.toHaveURL(/\/admin\/login(?:\?|$)/, { timeout: 60_000 })
}
