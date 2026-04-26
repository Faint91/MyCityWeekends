import fs from 'node:fs'
import path from 'node:path'
import { chromium, expect, type FullConfig } from '@playwright/test'

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth')
const AUTH_FILE = path.resolve(AUTH_DIR, 'admin.json')
const EMAIL_SELECTOR =
  'input[name="email"], #field-email, input[type="email"], input[autocomplete="email"], input[autocomplete="username"]'

const PASSWORD_SELECTOR = 'input[name="password"], #field-password, input[type="password"]'

const CONFIRM_PASSWORD_SELECTOR =
  'input[name="confirm-password"], #field-confirm-password, input[name="confirmPassword"], #field-confirmPassword, input[name*="confirm" i]'

const AUTH_READY_SELECTOR = `${EMAIL_SELECTOR}, ${CONFIRM_PASSWORD_SELECTOR}`

async function submitLoginForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.waitForSelector(EMAIL_SELECTOR, { timeout: 60_000 })
  await page.waitForSelector(PASSWORD_SELECTOR, { timeout: 60_000 })

  await page.locator(EMAIL_SELECTOR).first().fill(email)
  await page.locator(PASSWORD_SELECTOR).first().fill(password)

  const loginButton = page.getByRole('button', { name: /log ?in/i })
  await expect(loginButton).toBeEnabled({ timeout: 60_000 })

  await Promise.all([
    page.waitForURL((url) => url.pathname === '/admin', { timeout: 60_000 }),
    loginButton.click(),
  ])

  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/\/admin\/?$/)
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD

  if (!baseURL) {
    throw new Error('Missing Playwright baseURL')
  }

  if (!email || !password) {
    throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD')
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL: String(baseURL) })

  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined)

  await page.waitForSelector(AUTH_READY_SELECTOR, { timeout: 60_000 })

  const isFirstUser = (await page.locator(CONFIRM_PASSWORD_SELECTOR).count()) > 0

  if (isFirstUser) {
    await page.locator(EMAIL_SELECTOR).first().fill(email)
    await page.locator(PASSWORD_SELECTOR).first().fill(password)
    await page.locator(CONFIRM_PASSWORD_SELECTOR).first().fill(password)

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
    if (await postCreateLoginButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await postCreateLoginButton.click()
    }

    await page.waitForSelector(EMAIL_SELECTOR, { timeout: 60_000 })
    await page.waitForSelector(PASSWORD_SELECTOR, { timeout: 60_000 })
  }

  await submitLoginForm(page, email, password)

  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
}
