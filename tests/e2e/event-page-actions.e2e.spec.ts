import { test, expect } from '@playwright/test'

test('Event page core actions render and work', async ({ page }) => {
  await page.goto('/')

  const eventLinks = page.locator('a[href^="/event/"]')

  if ((await eventLinks.count()) === 0) {
    await expect(
      page.getByRole('heading', {
        name: /new events will be coming next tuesday night!/i,
      }),
    ).toBeVisible()

    return
  }

  await Promise.all([page.waitForURL(/\/event\//, { timeout: 15000 }), eventLinks.first().click()])

  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()

  const saveToggle = page.getByTestId('save-toggle')
  await expect(saveToggle).toBeVisible()

  const before = await saveToggle.getAttribute('aria-label')
  await expect(saveToggle).toHaveAttribute('aria-label', /save event|unsave event/i)

  await saveToggle.click()

  if (before?.match(/save event/i)) {
    await expect(saveToggle).toHaveAttribute('aria-label', /unsave event/i)
  } else {
    await expect(saveToggle).toHaveAttribute('aria-label', /save event/i)
  }

  await expect(page.getByRole('button', { name: /share/i })).toBeVisible()

  const officialLink = page.getByRole('link', { name: /official link/i })
  if ((await officialLink.count()) > 0) {
    await expect(officialLink.first()).toHaveAttribute('href', /.+/)
  }
})
