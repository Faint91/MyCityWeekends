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
  const sourceUrl = `https://example.com/source/${suffix}`
  const ticketUrl = `https://example.com/tickets/${suffix}`

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

export async function seedPublishableCandidateScenarioWithPublishedAndDraft() {
  const payload = await getTestPayload()
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const title = `Playwright Candidate Event ${suffix}`
  const venueName = `Playwright Venue ${suffix}`
  const startAt = '2026-04-18T18:00:00.000Z'
  const whyWorthItDraft = 'A seeded publishable event used for admin e2e coverage.'
  const sourceUrl = `https://example.com/source/${suffix}`
  const ticketUrl = `https://example.com/tickets/${suffix}`

  const publishedWeekendDrop = await payload.create({
    collection: 'weekend-drops',
    overrideAccess: true,
    draft: false,
    data: {
      title: `Playwright Published Weekend ${suffix}`,
      city: 'Vancouver, BC',
      weekendStart: '2099-04-18T00:00:00.000Z',
      weekendEnd: '2099-04-20T00:00:00.000Z',
      _status: 'published',
    },
  })

  const draftWeekendDrop = await payload.create({
    collection: 'weekend-drops',
    overrideAccess: true,
    draft: true,
    data: {
      title: `Playwright Draft Weekend ${suffix}`,
      city: 'Vancouver, BC',
      weekendStart: '2100-04-25T00:00:00.000Z',
      weekendEnd: '2100-04-27T00:00:00.000Z',
    },
  })

  const candidate = await payload.create({
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
      sourceUrl,
      ticketUrl,
      whyWorthItDraft,
      sectionSuggestion: 'free',
      confidenceScore: 99,
      status: 'new',
      adminNotes: 'Seeded by Playwright e2e test.',
    },
  })

  return {
    candidateId: candidate.id,
    title,
    startAt,
    venueName,
    whyWorthItDraft,
    sectionSuggestion: 'free' as const,
    publishedWeekendDropId: publishedWeekendDrop.id,
    draftWeekendDropId: draftWeekendDrop.id,
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
      weekendStart: '2099-04-18T00:00:00.000Z',
      weekendEnd: '2099-04-20T00:00:00.000Z',
    },
  })

  return {
    ...candidate,
    weekendDropId: weekendDrop.id,
    weekendDropTitle,
  }
}

export async function getWeekendDropItemById(id: number) {
  const payload = await getTestPayload()

  return payload.findByID({
    collection: 'weekend-drop-items',
    id,
    depth: 0,
    overrideAccess: true,
  })
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

  const eventIds = Array.from(new Set(events.docs.map((event) => event.id))).filter(
    (id): id is number => typeof id === 'number',
  )

  if (eventIds.length > 0) {
    const weekendDropItems = await payload.find({
      collection: 'weekend-drop-items',
      overrideAccess: true,
      limit: 100,
      where: {
        or: eventIds.map((eventId) => ({
          event: { equals: eventId },
        })),
      },
    })

    for (const item of weekendDropItems.docs) {
      await payload.delete({
        collection: 'weekend-drop-items',
        id: item.id,
        overrideAccess: true,
      })
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
