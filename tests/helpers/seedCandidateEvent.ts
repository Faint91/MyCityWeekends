import { getTestPayload } from './getTestPayload'
import config from '../../src/payload.config.js'

type SeededCandidateEvent = {
  candidateId: number
  title: string
  startAt: string
  venueName: string
  whyWorthItDraft: string
  sectionSuggestion: 'free'
  weekendDropId?: number
  weekendDropTitle?: string
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

export async function seedCandidateEvent(): Promise<SeededCandidateEvent> {
  const payload = await getTestPayload()

  const suffix = uniqueSuffix()
  const title = `Playwright Candidate Event ${suffix}`
  const venueName = `Playwright Venue ${suffix}`
  const startAt = '2026-04-18T18:00:00.000Z'
  const whyWorthItDraft = 'A seeded publishable event used for admin e2e coverage.'

  const created = await payload.create({
    collection: 'candidate-events',
    overrideAccess: true,
    data: {
      title,
      city: 'Vancouver, BC',
      description: 'Seeded candidate event for Playwright.',
      startAt,
      endAt: '2026-04-18T20:00:00.000Z',
      isFree: true,
      venueName,
      venueAddress: '350 W Georgia St, Vancouver, BC',
      neighborhood: 'Downtown',
      sourceName: 'Playwright Seed',
      sourceUrl: 'https://example.com/source',
      ticketUrl: 'https://example.com/tickets',
      whyWorthItDraft,
      sectionSuggestion: 'free',
      confidenceScore: 99,
      status: 'new',
      adminNotes: 'Seeded by Playwright e2e test.',
    },
  })

  return {
    candidateId: created.id,
    title,
    startAt,
    venueName,
    whyWorthItDraft,
    sectionSuggestion: 'free',
  }
}

export async function seedPublishableCandidateScenario(): Promise<SeededCandidateEvent> {
  const payload = await getTestPayload()
  const candidate = await seedCandidateEvent()

  const suffix = uniqueSuffix()
  const weekendDropTitle = `Playwright Weekend Drop ${suffix}`

  const weekendDrop = await payload.create({
    collection: 'weekend-drops',
    draft: true,
    overrideAccess: true,
    data: {
      title: weekendDropTitle,
      city: 'Vancouver, BC',
      weekendStart: '2026-04-18T00:00:00.000Z',
      weekendEnd: '2026-04-20T00:00:00.000Z',
    },
  })

  return {
    ...candidate,
    weekendDropId: weekendDrop.id,
    weekendDropTitle,
  }
}

export async function findEventByTitleAndStartAt(
  title: string,
  startAt: string,
  options?: { draft?: boolean },
) {
  const payload = await getTestPayload()

  const result = await payload.find({
    collection: 'events',
    overrideAccess: true,
    draft: options?.draft ?? false,
    limit: 1,
    where: {
      and: [{ title: { equals: title } }, { startAt: { equals: startAt } }],
    },
  })

  return result.docs[0] ?? null
}

export async function findWeekendDropItemByEventAndWeekendDrop(
  eventId: number,
  weekendDropId: number,
) {
  const payload = await getTestPayload()

  const result = await payload.find({
    collection: 'weekend-drop-items',
    overrideAccess: true,
    limit: 1,
    where: {
      and: [{ event: { equals: eventId } }, { weekendDrop: { equals: weekendDropId } }],
    },
  })

  return result.docs[0] ?? null
}

export async function getCandidateById(candidateId: number) {
  const payload = await getTestPayload()

  return payload.findByID({
    collection: 'candidate-events',
    id: candidateId,
    depth: 0,
    overrideAccess: true,
  })
}

export async function cleanupCandidateEventArtifacts(seed: SeededCandidateEvent): Promise<void> {
  const payload = await getTestPayload()

  const events = await payload.find({
    collection: 'events',
    overrideAccess: true,
    draft: true,
    limit: 20,
    where: {
      title: { equals: seed.title },
    },
  })

  const eventIds = new Set(events.docs.map((event) => event.id))

  if (seed.weekendDropId) {
    const weekendDropItems = await payload.find({
      collection: 'weekend-drop-items',
      overrideAccess: true,
      limit: 50,
      where: {
        weekendDrop: { equals: seed.weekendDropId },
      },
    })

    for (const item of weekendDropItems.docs) {
      const eventId = typeof item.event === 'number' ? item.event : item.event?.id

      if (eventId && eventIds.has(eventId)) {
        await payload.delete({
          collection: 'weekend-drop-items',
          id: item.id,
          overrideAccess: true,
        })
      }
    }
  }

  for (const event of events.docs) {
    await payload.delete({
      collection: 'events',
      id: event.id,
      overrideAccess: true,
    })
  }

  await payload.delete({
    collection: 'candidate-events',
    overrideAccess: true,
    where: {
      title: { equals: seed.title },
    },
  })

  if (seed.weekendDropId) {
    await payload.delete({
      collection: 'weekend-drops',
      id: seed.weekendDropId,
      overrideAccess: true,
    })
  }

  const venues = await payload.find({
    collection: 'venues',
    overrideAccess: true,
    limit: 20,
    where: {
      name: { equals: seed.venueName },
    },
  })

  for (const venue of venues.docs) {
    await payload.delete({
      collection: 'venues',
      id: venue.id,
      overrideAccess: true,
    })
  }
}
