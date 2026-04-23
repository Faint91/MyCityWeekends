import { test, expect } from '@playwright/test'
import {
  cleanupCandidateEventArtifacts,
  findEventByTitleAndStartAt,
  findWeekendDropItemByEventAndWeekendDrop,
  getCandidateById,
  getWeekendDropItemById,
  seedCandidateEvent,
  seedPublishableCandidateScenario,
  seedPublishableCandidateScenarioWithPublishedAndDraft,
} from '../helpers/seedCandidateEvent'

test.describe.configure({ mode: 'serial' })

test.describe('Candidate Events admin actions', () => {
  test('Admin Panel › can create a draft event from a candidate event', async ({ page }) => {
    test.setTimeout(120_000)

    const seeded = await seedCandidateEvent()

    try {
      await page.goto(`/admin/collections/candidate-events/${seeded.candidateId}`, {
        waitUntil: 'networkidle',
      })

      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
        .toBe(`/admin/collections/candidate-events/${seeded.candidateId}`)

      await expect(page).not.toHaveURL(/\/admin\/login(?:\?|$)/, { timeout: 5_000 })

      const createDraftButton = page.getByRole('button', { name: 'Create Draft Event' })
      await expect(createDraftButton).toBeVisible({ timeout: 15_000 })

      await createDraftButton.click()

      await expect(page).toHaveURL(/mcwAction=create-draft-success/, {
        timeout: 60_000,
      })

      await expect(page.getByText('Draft event created.')).toBeVisible({
        timeout: 60_000,
      })

      const createdEvent = await findEventByTitleAndStartAt(seeded.title, seeded.startAt, {
        draft: true,
      })
      expect(createdEvent).not.toBeNull()
      expect(createdEvent?.title).toBe(seeded.title)
      expect(createdEvent?._status).toBe('draft')

      const updatedCandidate = await getCandidateById(seeded.candidateId)
      expect(updatedCandidate.status).toBe('draft_created')
      expect(updatedCandidate.publishedEvent).toBeFalsy()
    } finally {
      await cleanupCandidateEventArtifacts(seeded)
    }
  })

  test('Admin Panel › can publish a candidate event', async ({ page }) => {
    test.setTimeout(120_000)

    const seeded = await seedPublishableCandidateScenario()

    try {
      await page.goto(`/admin/collections/candidate-events/${seeded.candidateId}`, {
        waitUntil: 'networkidle',
      })

      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
        .toBe(`/admin/collections/candidate-events/${seeded.candidateId}`)

      await expect(page).not.toHaveURL(/\/admin\/login(?:\?|$)/, { timeout: 5_000 })

      const publishButton = page.getByRole('button', { name: 'Publish Now' })
      await expect(publishButton).toBeVisible({ timeout: 15_000 })

      await publishButton.click()

      await expect(page).toHaveURL(/mcwAction=publish-success/, {
        timeout: 60_000,
      })

      await expect(page.getByText('Candidate published.')).toBeVisible({
        timeout: 60_000,
      })

      const createdEvent = await findEventByTitleAndStartAt(seeded.title, seeded.startAt, {
        draft: false,
      })
      expect(createdEvent).not.toBeNull()
      expect(createdEvent?.title).toBe(seeded.title)
      expect(createdEvent?._status).toBe('published')

      const updatedCandidate = await getCandidateById(seeded.candidateId)

      const publishedEventId =
        typeof updatedCandidate.publishedEvent === 'number'
          ? updatedCandidate.publishedEvent
          : updatedCandidate.publishedEvent?.id

      const publishedWeekendDropItemId =
        typeof updatedCandidate.publishedWeekendDropItem === 'number'
          ? updatedCandidate.publishedWeekendDropItem
          : updatedCandidate.publishedWeekendDropItem?.id

      expect(updatedCandidate.status).toBe('published')
      expect(publishedEventId).toBe(createdEvent!.id)
      expect(publishedWeekendDropItemId).toBeTruthy()

      const createdDropItem = await getWeekendDropItemById(publishedWeekendDropItemId!)
      expect(createdDropItem).not.toBeNull()
      expect(createdDropItem.section).toBe(seeded.sectionSuggestion)
      expect(createdDropItem.whyWorthIt).toBe(seeded.whyWorthItDraft)
    } finally {
      await cleanupCandidateEventArtifacts(seeded)
    }
  })

  test('Admin Panel › publish now attaches to latest published weekend drop, not latest draft', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const seeded = await seedPublishableCandidateScenarioWithPublishedAndDraft()

    try {
      await page.goto(`/admin/collections/candidate-events/${seeded.candidateId}`, {
        waitUntil: 'networkidle',
      })

      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
        .toBe(`/admin/collections/candidate-events/${seeded.candidateId}`)

      await expect(page).not.toHaveURL(/\/admin\/login(?:\?|$)/, { timeout: 5_000 })

      const publishButton = page.getByRole('button', { name: 'Publish Now' })
      await expect(publishButton).toBeVisible({ timeout: 15_000 })

      await publishButton.click()

      await expect(page).toHaveURL(/mcwAction=publish-success/, {
        timeout: 60_000,
      })

      const createdEvent = await findEventByTitleAndStartAt(seeded.title, seeded.startAt, {
        draft: false,
      })
      expect(createdEvent).not.toBeNull()

      const createdDropItemOnPublished = await findWeekendDropItemByEventAndWeekendDrop(
        createdEvent!.id,
        seeded.publishedWeekendDropId,
      )
      expect(createdDropItemOnPublished).not.toBeNull()

      const createdDropItemOnDraft = await findWeekendDropItemByEventAndWeekendDrop(
        createdEvent!.id,
        seeded.draftWeekendDropId,
      )
      expect(createdDropItemOnDraft).toBeNull()
    } finally {
      await cleanupCandidateEventArtifacts({
        ...seeded,
        weekendDropId: seeded.publishedWeekendDropId,
      })
    }
  })

  test('Admin Panel › publishing a legacy budget candidate creates an under30 weekend drop item', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const seeded = await seedPublishableCandidateScenario()

    try {
      // Keep the seed simple, then switch it to the legacy budget value before publishing
      // so we verify the server-side normalization path.
      const { getTestPayload } = await import('../helpers/getTestPayload')
      const payload = await getTestPayload()

      const legacyBudgetSection = 'under15' as unknown as 'top3' | 'free' | 'under30'

      await payload.update({
        collection: 'candidate-events',
        id: seeded.candidateId,
        overrideAccess: true,
        data: {
          // Test-only cast: simulate a legacy persisted value that is no longer
          // part of the current typed schema, so we can verify normalization.
          sectionSuggestion: legacyBudgetSection,
        },
      })

      await page.goto(`/admin/collections/candidate-events/${seeded.candidateId}`, {
        waitUntil: 'networkidle',
      })

      await expect
        .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
        .toBe(`/admin/collections/candidate-events/${seeded.candidateId}`)

      const publishButton = page.getByRole('button', { name: 'Publish Now' })
      await expect(publishButton).toBeVisible({ timeout: 15_000 })

      await publishButton.click()

      await expect(page).toHaveURL(/mcwAction=publish-success/, {
        timeout: 60_000,
      })

      const createdEvent = await findEventByTitleAndStartAt(seeded.title, seeded.startAt, {
        draft: false,
      })
      expect(createdEvent).not.toBeNull()

      const updatedCandidate = await getCandidateById(seeded.candidateId)

      const publishedWeekendDropItemId =
        typeof updatedCandidate.publishedWeekendDropItem === 'number'
          ? updatedCandidate.publishedWeekendDropItem
          : updatedCandidate.publishedWeekendDropItem?.id

      expect(publishedWeekendDropItemId).toBeTruthy()

      const createdDropItem = await getWeekendDropItemById(publishedWeekendDropItemId!)
      expect(createdDropItem).not.toBeNull()
      expect(createdDropItem.section).toBe('under30')
    } finally {
      await cleanupCandidateEventArtifacts(seeded)
    }
  })
})
