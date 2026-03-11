import { getPayloadClient } from './payload'
export type WeekendSection = 'top3' | 'free' | 'under15' | 'under30'

type WeekendDrop = {
  id: string
  title?: string
  city?: string
  weekendStart?: string
  weekendEnd?: string
}

type Venue = {
  id: string
  name?: string
  neighborhood?: string
  address?: string
}

type EventDoc = {
  id: string
  title?: string
  startAt?: string
  endAt?: string
  isFree?: boolean
  priceMin?: number | null
  priceMax?: number | null
  currency?: 'CAD' | 'USD'
  ticketUrl?: string
  sourceUrl?: string
  neighborhood?: string
  venue?: string | Venue | null
  slug?: string
}

type WeekendDropItemDoc = {
  id: string
  rank?: number
  section?: string
  whyWorthIt?: string
  event?: string | EventDoc | null
}

export async function getLatestPublishedWeekendDrop() {
  const payload = await getPayloadClient()

  const drops = await payload.find({
    collection: 'weekend-drops',
    where: { _status: { equals: 'published' } },
    sort: '-weekendStart',
    limit: 1,
    depth: 0,
  })

  return (drops.docs?.[0] as unknown as WeekendDrop) ?? null
}

export async function getWeekendDropTop3Items(weekendDropId: string | number) {
  return getWeekendDropItemsBySection(weekendDropId, 'top3', 3)
}

export async function getWeekendDropItemsBySection(
  weekendDrop: string | number | { id?: string | number } | undefined | null,
  section: WeekendSection,
  limit = 50,
) {
  const weekendDropId =
    typeof weekendDrop === 'string' || typeof weekendDrop === 'number'
      ? weekendDrop
      : weekendDrop?.id

  if (weekendDropId === undefined || weekendDropId === null) return []

  const payload = await getPayloadClient()

  const items = await payload.find({
    collection: 'weekend-drop-items',
    where: {
      weekendDrop: { equals: weekendDropId as any },
      section: { equals: section },
    },
    sort: 'rank',
    limit,
    overrideAccess: true,
    depth: 5,
    draft: false,
  })

  return (items.docs as unknown as WeekendDropItemDoc[]) ?? []
}

export function formatPrice(event: EventDoc): string {
  if (event.isFree) return 'Free'

  const min = event.priceMin ?? null
  const max = event.priceMax ?? null
  const cur = event.currency ?? 'CAD'

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n)

  if (typeof min === 'number' && typeof max === 'number') {
    if (min === max) return fmt(min)
    return `${fmt(min)}–${fmt(max)}`
  }

  if (typeof min === 'number') return `From ${fmt(min)}`
  if (typeof max === 'number') return `Up to ${fmt(max)}`
  return 'Cheap'
}

export function formatWhen(startAt?: string): string | null {
  if (!startAt) return null
  const d = new Date(startAt)

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

export function getVenueName(event: EventDoc): string | null {
  if (!event.venue) return null
  if (typeof event.venue === 'string') return null
  return event.venue.name ?? null
}
