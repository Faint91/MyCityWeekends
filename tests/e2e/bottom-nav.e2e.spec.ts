import { test, expect } from '@playwright/test'

test.describe('Bottom nav (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('nav is visible, no horizontal scroll, footer not covered, and it navigates', async ({
    page,
  }) => {
    await page.goto('/')

    const nav = page.getByRole('navigation', { name: 'Primary' })
    await expect(nav).toBeVisible()

    // no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      const doc = document.documentElement
      return doc.scrollWidth > doc.clientWidth
    })
    expect(hasHorizontalScroll).toBe(false)

    // footer not covered by fixed nav
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()

    const overlap = await page.evaluate(() => {
      const navEl = document.querySelector('nav[aria-label="Primary"]') as HTMLElement | null
      const footerEl = document.querySelector('footer') as HTMLElement | null
      if (!navEl || !footerEl) return false
      const navRect = navEl.getBoundingClientRect()
      const footerRect = footerEl.getBoundingClientRect()
      return footerRect.bottom > navRect.top
    })
    expect(overlap).toBe(false)

    // navigation works
    await Promise.all([
      page.waitForURL(/\/free\/?$/, { timeout: 15000 }),
      nav.getByRole('link', { name: /^Free$/i }).click(),
    ])
    await expect(
      page.getByRole('heading', { level: 1, name: /^Free this weekend$/i }),
    ).toBeVisible()

    await Promise.all([
      await nav.getByRole('link', { name: /^Saved$/i }).click(),
      await expect(page).toHaveURL(/\/saved\/?$/),
    ])
    await expect(page.getByRole('heading', { level: 1, name: /^Saved$/ })).toBeVisible()

    await Promise.all([
      await nav.getByRole('link', { name: /under \$30/i }).click(),
      await expect(page).toHaveURL(/\/under-30\/?$/),
    ])
    await expect(page.getByRole('heading', { level: 1, name: /^Under \$30$/i })).toBeVisible()
  })

  test('legacy /under-15 redirects to /under-30', async ({ page }) => {
    await page.goto('/under-15')
    await expect(page).toHaveURL(/\/under-30\/?$/)
    await expect(page.getByRole('heading', { level: 1, name: /^Under \$30$/i })).toBeVisible()
  })
})
