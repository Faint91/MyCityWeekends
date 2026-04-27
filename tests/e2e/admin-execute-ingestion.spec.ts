import { test, expect } from '@playwright/test'
import { cleanupMockDiscoveryArtifacts } from '../helpers/mockDiscoveryCleanup'

test.describe.configure({ mode: 'serial' })

test.describe('Admin dashboard ingestion panel', () => {
  test.beforeEach(async () => {
    await cleanupMockDiscoveryArtifacts()
  })

  test.afterEach(async () => {
    await cleanupMockDiscoveryArtifacts()
  })

  test('Admin Panel › can queue mock ingestion from the dashboard', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/admin', { waitUntil: 'networkidle' })

    await expect(page.getByRole('heading', { name: 'Execute Ingestion' })).toBeVisible({
      timeout: 60_000,
    })

    const sourceSelect = page.locator('select').first()
    await expect(sourceSelect).toBeVisible({
      timeout: 60_000,
    })
    await sourceSelect.selectOption('mock')

    const executeButton = page.getByRole('button', { name: 'Execute Ingestion' })
    await expect(executeButton).toBeVisible({
      timeout: 60_000,
    })
    await executeButton.click()

    await expect(page.getByText('Ingestion queued.')).toBeVisible({
      timeout: 60_000,
    })

    await expect(page.getByText('Source: mock')).toBeVisible()
    await expect(page.getByText('City: Vancouver, BC')).toBeVisible()
    await expect(page.getByText('Parent ingestion run ID:')).toBeVisible()
    await expect(page.getByText('Initial status: running')).toBeVisible()
    await expect(page.getByText('Requested sections: free, under30, top3')).toBeVisible()
    await expect(page.getByText('Queued first section: free')).toBeVisible()
    await expect(page.getByText('Queue messages prepared: 3')).toBeVisible()
    await expect(page.getByText(/Queue messages published now: \d+/)).toBeVisible()

    await expect(page.getByRole('link', { name: 'Open Ingestion Run' })).toBeVisible({
      timeout: 60_000,
    })

    await expect(page.getByRole('link', { name: 'Review Candidate Events' })).toBeVisible({
      timeout: 60_000,
    })
  })
})
