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

export type CleanupExpiredWeekendDropResult = {
  ok: true
  skipped: boolean
  reason?: string
  city: string
  cutoffIso: string
  weekendDropId?: string | number
  weekendDropTitle?: string | null
  weekendDropItemIds: Array<string | number>
  eventIds: Array<string | number>
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
  } = {},
): Promise<CleanupExpiredWeekendDropResult> {
  const city = input.city?.trim() || DEFAULT_CITY
  const now = input.now ?? new Date()
  const cutoffIso = now.toISOString()

  const expiredDrops = await payload.find({
    collection: 'weekend-drops',
    draft: false,
    overrideAccess: true,
    limit: 1,
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

  const weekendDrop = expiredDrops.docs[0]

  if (!weekendDrop) {
    return {
      ok: true,
      skipped: true,
      reason: 'No expired Weekend Drop found.',
      city,
      cutoffIso,
      weekendDropItemIds: [],
      eventIds: [],
      deletedWeekendDropItems: 0,
      deletedEvents: 0,
      skippedEventsStillReferenced: [],
      deletedWeekendDrop: false,
    }
  }

  const weekendDropItems = await payload.find({
    collection: 'weekend-drop-items',
    overrideAccess: true,
    limit: 200,
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
    weekendDropId: weekendDrop.id,
    weekendDropTitle: weekendDrop.title ?? null,
    weekendDropItemIds,
    eventIds,
    deletedWeekendDropItems,
    deletedEvents,
    skippedEventsStillReferenced,
    deletedWeekendDrop: true,
  }
}
