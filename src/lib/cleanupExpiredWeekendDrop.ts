import type { Payload } from 'payload'

const DEFAULT_CITY = 'Vancouver, BC'

type RelationshipValue = string | number | { id?: string | number | null } | null | undefined

function getRelationshipId(value: RelationshipValue): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number') return value
  return value.id ?? null
}

function uniqueIds(ids: Array<string | number | null>): Array<string | number> {
  return Array.from(new Set(ids.filter((id): id is string | number => id !== null)))
}

async function clearCandidateEventReferences(input: {
  payload: Payload
  weekendDropItemIds: Array<string | number>
  eventIds: Array<string | number>
}): Promise<number> {
  const { payload, weekendDropItemIds, eventIds } = input
  const candidateIdsToClear = new Set<string | number>()

  for (const weekendDropItemId of weekendDropItemIds) {
    const result = await payload.find({
      collection: 'candidate-events',
      overrideAccess: true,
      limit: 50,
      where: {
        publishedWeekendDropItem: {
          equals: weekendDropItemId,
        },
      },
    })

    for (const candidate of result.docs) {
      candidateIdsToClear.add(candidate.id)
    }
  }

  for (const eventId of eventIds) {
    const publishedEventResult = await payload.find({
      collection: 'candidate-events',
      overrideAccess: true,
      limit: 50,
      where: {
        publishedEvent: {
          equals: eventId,
        },
      },
    })

    for (const candidate of publishedEventResult.docs) {
      candidateIdsToClear.add(candidate.id)
    }

    const possibleDuplicateResult = await payload.find({
      collection: 'candidate-events',
      overrideAccess: true,
      limit: 50,
      where: {
        possibleDuplicateEvent: {
          equals: eventId,
        },
      },
    })

    for (const candidate of possibleDuplicateResult.docs) {
      candidateIdsToClear.add(candidate.id)
    }
  }

  for (const candidateId of candidateIdsToClear) {
    await payload.update({
      collection: 'candidate-events',
      id: candidateId,
      overrideAccess: true,
      data: {
        publishedEvent: null,
        publishedWeekendDropItem: null,
        possibleDuplicateEvent: null,
      },
    })
  }

  return candidateIdsToClear.size
}

export type CleanupExpiredWeekendDropResult = {
  ok: true
  skipped: boolean
  reason?: string
  city: string
  cutoffIso: string
  minimumWeekendEndIso?: string | null
  weekendDropId?: string | number
  weekendDropTitle?: string | null
  weekendDropItemIds: Array<string | number>
  eventIds: Array<string | number>
  clearedCandidateEvents: number
  deletedWeekendDropItems: number
  deletedEvents: number
  skippedEventsStillReferenced: Array<string | number>
  deletedWeekendDrop: boolean
}

export async function cleanupLatestExpiredWeekendDrop(
  payload: Payload,
  input: {
    city?: string
    now?: Date
    minimumWeekendEndIso?: string | null
  } = {},
): Promise<CleanupExpiredWeekendDropResult> {
  const city = input.city?.trim() || DEFAULT_CITY
  const now = input.now ?? new Date()
  const cutoffIso = now.toISOString()
  const minimumWeekendEndIso = input.minimumWeekendEndIso ?? null
  const minimumWeekendEndMs = minimumWeekendEndIso ? new Date(minimumWeekendEndIso).getTime() : null

  const expiredDrops = await payload.find({
    collection: 'weekend-drops',
    draft: false,
    overrideAccess: true,
    limit: 10,
    sort: '-weekendEnd',
    where: {
      and: [
        {
          city: {
            equals: city,
          },
        },
        {
          weekendEnd: {
            less_than: cutoffIso,
          },
        },
      ],
    },
  })

  const weekendDrop = expiredDrops.docs.find((drop) => {
    if (!minimumWeekendEndMs) return true

    const weekendEnd = typeof drop.weekendEnd === 'string' ? drop.weekendEnd : null
    if (!weekendEnd) return false

    return new Date(weekendEnd).getTime() >= minimumWeekendEndMs
  })

  if (!weekendDrop) {
    return {
      ok: true,
      skipped: true,
      reason: minimumWeekendEndIso
        ? 'No expired Weekend Drop found inside the cleanup window.'
        : 'No expired Weekend Drop found.',
      city,
      cutoffIso,
      minimumWeekendEndIso,
      weekendDropItemIds: [],
      eventIds: [],
      clearedCandidateEvents: 0,
      deletedWeekendDropItems: 0,
      deletedEvents: 0,
      skippedEventsStillReferenced: [],
      deletedWeekendDrop: false,
    }
  }

  const weekendDropItems = await payload.find({
    collection: 'weekend-drop-items',
    overrideAccess: true,
    limit: 500,
    where: {
      weekendDrop: {
        equals: weekendDrop.id,
      },
    },
  })

  const weekendDropItemIds = weekendDropItems.docs.map((item) => item.id)
  const eventIds = uniqueIds(
    weekendDropItems.docs.map((item) => getRelationshipId(item.event as RelationshipValue)),
  )

  const clearedCandidateEvents = await clearCandidateEventReferences({
    payload,
    weekendDropItemIds,
    eventIds,
  })

  let deletedWeekendDropItems = 0
  let deletedEvents = 0
  const skippedEventsStillReferenced: Array<string | number> = []

  for (const item of weekendDropItems.docs) {
    await payload.delete({
      collection: 'weekend-drop-items',
      id: item.id,
      overrideAccess: true,
    })

    deletedWeekendDropItems += 1
  }

  for (const eventId of eventIds) {
    const otherItemsForEvent = await payload.find({
      collection: 'weekend-drop-items',
      overrideAccess: true,
      limit: 1,
      where: {
        event: {
          equals: eventId,
        },
      },
    })

    if (otherItemsForEvent.totalDocs > 0) {
      skippedEventsStillReferenced.push(eventId)
      continue
    }

    await payload.delete({
      collection: 'events',
      id: eventId,
      overrideAccess: true,
    })

    deletedEvents += 1
  }

  await payload.delete({
    collection: 'weekend-drops',
    id: weekendDrop.id,
    overrideAccess: true,
  })

  return {
    ok: true,
    skipped: false,
    city,
    cutoffIso,
    minimumWeekendEndIso,
    weekendDropId: weekendDrop.id,
    weekendDropTitle: weekendDrop.title ?? null,
    weekendDropItemIds,
    eventIds,
    clearedCandidateEvents,
    deletedWeekendDropItems,
    deletedEvents,
    skippedEventsStillReferenced,
    deletedWeekendDrop: true,
  }
}
