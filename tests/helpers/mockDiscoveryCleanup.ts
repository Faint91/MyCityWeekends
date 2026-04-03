import { getTestPayload } from './getTestPayload'
import config from '../../src/payload.config.js'

const MOCK_TITLES = [
  'Sunset Food Truck Social',
  'Indie Comedy Basement Night',
  'Makers Market Pop-Up',
]

const MOCK_VENUES = ['Canada Place', 'Granville Basement Theatre', 'Mount Pleasant Community Hall']

export async function countMockDiscoveryCandidates(): Promise<number> {
  const payload = await getTestPayload()

  const candidates = await payload.find({
    collection: 'candidate-events',
    overrideAccess: true,
    depth: 0,
    limit: 100,
    where: {
      sourceName: {
        equals: 'Mock Discovery Feed',
      },
    },
  })

  return candidates.totalDocs
}

export async function cleanupMockDiscoveryArtifacts(): Promise<void> {
  const payload = await getTestPayload()

  const events = await payload.find({
    collection: 'events',
    overrideAccess: true,
    draft: true,
    limit: 100,
    where: {
      title: {
        in: MOCK_TITLES,
      },
    },
  })

  const eventIds = new Set(events.docs.map((event) => event.id))

  if (eventIds.size > 0) {
    const weekendDropItems = await payload.find({
      collection: 'weekend-drop-items',
      overrideAccess: true,
      limit: 100,
      where: {
        event: {
          in: Array.from(eventIds),
        },
      },
    })

    for (const item of weekendDropItems.docs) {
      await payload.delete({
        collection: 'weekend-drop-items',
        id: item.id,
        overrideAccess: true,
      })
    }

    for (const event of events.docs) {
      await payload.delete({
        collection: 'events',
        id: event.id,
        overrideAccess: true,
      })
    }
  }

  const candidates = await payload.find({
    collection: 'candidate-events',
    overrideAccess: true,
    limit: 100,
    where: {
      or: [
        {
          title: {
            in: MOCK_TITLES,
          },
        },
        {
          sourceName: {
            equals: 'Mock Discovery Feed',
          },
        },
      ],
    },
  })

  for (const candidate of candidates.docs) {
    await payload.delete({
      collection: 'candidate-events',
      id: candidate.id,
      overrideAccess: true,
    })
  }

  const ingestionRuns = await payload.find({
    collection: 'ingestion-runs',
    overrideAccess: true,
    limit: 100,
    where: {
      promptVersion: {
        equals: 'mock-v1',
      },
    },
  })

  for (const run of ingestionRuns.docs) {
    await payload.delete({
      collection: 'ingestion-runs',
      id: run.id,
      overrideAccess: true,
    })
  }

  const venues = await payload.find({
    collection: 'venues',
    overrideAccess: true,
    limit: 100,
    where: {
      name: {
        in: MOCK_VENUES,
      },
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
