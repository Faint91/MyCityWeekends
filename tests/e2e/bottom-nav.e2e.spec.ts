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
    await nav.getByRole('link', { name: /free/i }).click()
    await expect(page.getByRole('heading', { name: /free this weekend/i })).toBeVisible()

    await nav.getByRole('link', { name: /under \$15/i }).click()
    await expect(page.getByRole('heading', { name: /under \$15/i })).toBeVisible()
  })
})
