import type { Payload } from 'payload'

const WEEKEND_DROP_TIME_ZONE = 'America/Vancouver'

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getOrdinal(day: number): string {
  const mod10 = day % 10
  const mod100 = day % 100

  if (mod10 === 1 && mod100 !== 11) return 'st'
  if (mod10 === 2 && mod100 !== 12) return 'nd'
  if (mod10 === 3 && mod100 !== 13) return 'rd'
  return 'th'
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function formatWeekendDropTitleFromStart(weekendStartIso: string): string {
  const fridayUtc = new Date(weekendStartIso)
  const saturdayUtc = addDaysUtc(fridayUtc, 1)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WEEKEND_DROP_TIME_ZONE,
    month: 'long',
    day: 'numeric',
  }).formatToParts(saturdayUtc)

  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1')

  return `${month} ${day}${getOrdinal(day)}`
}

function toWeekendDropEndInclusive(weekendEndExclusiveIso: string): string {
  return new Date(new Date(weekendEndExclusiveIso).getTime() - 1).toISOString()
}

function getLocalDateParts(
  date: Date,
  timeZone: string,
): {
  year: number
  month: number
  day: number
  weekday: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  }
}

function addDaysToLocalDate(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  anchor.setUTCDate(anchor.getUTCDate() + days)

  return {
    year: anchor.getUTCFullYear(),
    month: anchor.getUTCMonth() + 1,
    day: anchor.getUTCDate(),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  const match = timeZoneName?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
  if (!match) {
    throw new Error(`Could not determine timezone offset for ${timeZone}`)
  }

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2])
  const minutes = Number(match[3] ?? '0')

  return sign * ((hours * 60 + minutes) * 60 * 1000)
}

function zonedDateTimeToUtcIso(
  local: {
    year: number
    month: number
    day: number
    hour: number
    minute?: number
    second?: number
    millisecond?: number
  },
  timeZone: string,
): string {
  const baseUtcMs = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute ?? 0,
    local.second ?? 0,
    local.millisecond ?? 0,
  )

  let utcMs = baseUtcMs

  for (let i = 0; i < 2; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone)
    utcMs = baseUtcMs - offsetMs
  }

  return new Date(utcMs).toISOString()
}

export function getNextDiscoveryWeekendWindow(): {
  weekendStart: string
  weekendEnd: string
} {
  const now = new Date()
  const localNow = getLocalDateParts(now, WEEKEND_DROP_TIME_ZONE)

  const daysUntilFriday = (5 - localNow.weekday + 7) % 7 || 7

  const fridayLocal = addDaysToLocalDate(
    localNow.year,
    localNow.month,
    localNow.day,
    daysUntilFriday,
  )

  const mondayLocal = addDaysToLocalDate(fridayLocal.year, fridayLocal.month, fridayLocal.day, 3)

  return {
    weekendStart: zonedDateTimeToUtcIso(
      {
        ...fridayLocal,
        hour: 0,
      },
      WEEKEND_DROP_TIME_ZONE,
    ),
    weekendEnd: zonedDateTimeToUtcIso(
      {
        ...mondayLocal,
        hour: 0,
      },
      WEEKEND_DROP_TIME_ZONE,
    ),
  }
}

export async function ensureDiscoveryWeekendDrop(
  payload: Payload,
  input: {
    city?: string
    weekendStart?: string
    weekendEnd?: string
  } = {},
) {
  const weekendWindow = getNextDiscoveryWeekendWindow()

  const city = cleanString(input.city) ?? 'Vancouver, BC'
  const weekendStart = cleanString(input.weekendStart) ?? weekendWindow.weekendStart
  const weekendEnd = cleanString(input.weekendEnd) ?? weekendWindow.weekendEnd

  const existingDraft = await payload.find({
    collection: 'weekend-drops',
    draft: true,
    overrideAccess: true,
    limit: 1,
    where: {
      and: [{ city: { equals: city } }, { weekendStart: { equals: weekendStart } }],
    },
  })

  const existingDraftDrop = existingDraft.docs[0]
  if (existingDraftDrop) {
    return existingDraftDrop
  }

  const existingPublished = await payload.find({
    collection: 'weekend-drops',
    draft: false,
    overrideAccess: true,
    limit: 1,
    where: {
      and: [{ city: { equals: city } }, { weekendStart: { equals: weekendStart } }],
    },
  })

  const existingPublishedDrop = existingPublished.docs[0]
  if (existingPublishedDrop) {
    return existingPublishedDrop
  }

  return payload.create({
    collection: 'weekend-drops',
    draft: true,
    overrideAccess: true,
    data: {
      title: formatWeekendDropTitleFromStart(weekendStart),
      city,
      weekendStart,
      weekendEnd: toWeekendDropEndInclusive(weekendEnd),
    },
  })
}

export async function publishDiscoveryWeekendDrop(
  payload: Payload,
  input: {
    city?: string
    weekendStart?: string
    weekendEnd?: string
  } = {},
) {
  const weekendWindow = getNextDiscoveryWeekendWindow()

  const city = cleanString(input.city) ?? 'Vancouver, BC'
  const weekendStart = cleanString(input.weekendStart) ?? weekendWindow.weekendStart
  const weekendEnd = cleanString(input.weekendEnd) ?? weekendWindow.weekendEnd

  const existingDraft = await payload.find({
    collection: 'weekend-drops',
    draft: true,
    overrideAccess: true,
    limit: 1,
    where: {
      and: [{ city: { equals: city } }, { weekendStart: { equals: weekendStart } }],
    },
  })

  const existingPublished =
    existingDraft.docs[0] ??
    (
      await payload.find({
        collection: 'weekend-drops',
        draft: false,
        overrideAccess: true,
        limit: 1,
        where: {
          and: [{ city: { equals: city } }, { weekendStart: { equals: weekendStart } }],
        },
      })
    ).docs[0]

  if (existingPublished) {
    const status =
      existingPublished && typeof existingPublished === 'object' && '_status' in existingPublished
        ? existingPublished._status
        : undefined

    if (status === 'published') {
      return existingPublished
    }

    return payload.update({
      collection: 'weekend-drops',
      id: existingPublished.id,
      draft: false,
      overrideAccess: true,
      data: {
        _status: 'published',
      },
    })
  }

  return payload.create({
    collection: 'weekend-drops',
    draft: false,
    overrideAccess: true,
    data: {
      title: formatWeekendDropTitleFromStart(weekendStart),
      city,
      weekendStart,
      weekendEnd: toWeekendDropEndInclusive(weekendEnd),
      _status: 'published',
    },
  })
}
