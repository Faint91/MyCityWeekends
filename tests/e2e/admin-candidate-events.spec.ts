import { test, expect } from '@playwright/test'
import {
  cleanupCandidateEventArtifacts,
  findEventByTitleAndStartAt,
  findWeekendDropItemByEventAndWeekendDrop,
  getCandidateById,
  seedCandidateEvent,
  seedPublishableCandidateScenario,
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

      const createdDropItem = await findWeekendDropItemByEventAndWeekendDrop(
        createdEvent!.id,
        seeded.weekendDropId!,
      )
      expect(createdDropItem).not.toBeNull()
      expect(createdDropItem?.section).toBe(seeded.sectionSuggestion)
      expect(createdDropItem?.whyWorthIt).toBe(seeded.whyWorthItDraft)

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
      expect(publishedWeekendDropItemId).toBe(createdDropItem!.id)
    } finally {
      await cleanupCandidateEventArtifacts(seeded)
    }
  })
})
