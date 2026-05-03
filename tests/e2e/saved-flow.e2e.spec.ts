import { test, expect } from '@playwright/test'

test('Saved flow works end to end', async ({ page }) => {
  await page.goto('/')

  const eventCards = page.locator('article')

  if ((await eventCards.count()) === 0) {
    await page.goto('/saved')
    await expect(page).toHaveURL(/\/saved\/?$/)
    await expect(page.getByRole('heading', { level: 1, name: /^Saved$/ })).toBeVisible()
    await expect(page.getByText(/no saved events/i)).toBeVisible()
    return
  }

  const firstCard = eventCards.first()
  const title = ((await firstCard.getByRole('heading').first().textContent()) ?? '').trim()

  const saveButton = firstCard.getByTestId('save-toggle')
  await expect(saveButton).toHaveAttribute('aria-label', /save event/i)

  await saveButton.click()
  await expect(saveButton).toHaveAttribute('aria-label', /unsave event/i)

  await page.goto('/saved')
  await expect(page).toHaveURL(/\/saved\/?$/)
  await expect(page.getByRole('heading', { level: 1, name: /^Saved$/ })).toBeVisible()

  const savedCard = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .first()

  await expect(savedCard).toBeVisible()

  const savedToggle = savedCard.getByTestId('save-toggle')
  await expect(savedToggle).toHaveAttribute('aria-label', /unsave event/i)

  await savedToggle.click()
  await expect(page.getByText(/no saved events/i)).toBeVisible()
})
