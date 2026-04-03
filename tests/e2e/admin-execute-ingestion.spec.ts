import { test, expect } from '@playwright/test'
import {
  cleanupMockDiscoveryArtifacts,
  countMockDiscoveryCandidates,
} from '../helpers/mockDiscoveryCleanup'

test.describe.configure({ mode: 'serial' })

test.describe('Admin dashboard ingestion panel', () => {
  test.beforeEach(async () => {
    await cleanupMockDiscoveryArtifacts()
  })

  test.afterEach(async () => {
    await cleanupMockDiscoveryArtifacts()
  })

  test('Admin Panel › can execute mock ingestion from the dashboard', async ({ page }) => {
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

    await expect(page.getByText('Ingestion completed.')).toBeVisible({
      timeout: 60_000,
    })

    await expect(page.getByText('Source: mock')).toBeVisible()
    await expect(page.getByText('City: Vancouver, BC')).toBeVisible()
    await expect(page.getByText('Found: 3')).toBeVisible()
    await expect(page.getByText('Inserted: 3')).toBeVisible()
    await expect(page.getByText('Duplicates: 0')).toBeVisible()

    await page.goto('/admin/collections/candidate-events', {
      waitUntil: 'domcontentloaded',
    })

    if (new URL(page.url()).pathname === '/admin/login') {
      await page.goto('/admin/collections/candidate-events', {
        waitUntil: 'domcontentloaded',
      })
    }

    await expect
      .poll(() => new URL(page.url()).pathname, {
        timeout: 60_000,
      })
      .toBe('/admin/collections/candidate-events')
    const totalMockCandidates = await countMockDiscoveryCandidates()
    expect(totalMockCandidates).toBe(3)
  })
})
