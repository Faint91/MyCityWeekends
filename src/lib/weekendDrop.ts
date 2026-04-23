import { getPayloadClient } from './payload'
export type WeekendSection = 'top3' | 'free' | 'under15' | 'under30'
import type { Media } from '@/payload-types'

type WeekendDrop = {
  id: string | number
  title?: string | null
  city?: string | null
  weekendStart?: string | null
  weekendEnd?: string | null
}

type Venue = {
  id: string | number
  name?: string | null
  neighborhood?: string | null
  address?: string | null
}

type EventDoc = {
  id: string | number
  title?: string | null
  startAt?: string | null
  endAt?: string | null
  isFree?: boolean | null
  priceMin?: number | null
  priceMax?: number | null
  currency?: 'CAD' | 'USD' | null
  ticketUrl?: string | null
  sourceUrl?: string | null
  neighborhood?: string | null
  venue?: string | number | Venue | null
  slug?: string | null
  image?: number | Media | null
}

type WeekendDropItemDoc = {
  id: string | number
  rank?: number | null
  section?: string | null
  whyWorthIt?: string | null
  event?: string | number | EventDoc | null
}

type PriceableEvent = Pick<EventDoc, 'isFree' | 'priceMin' | 'priceMax' | 'currency'>
type VenueLikeEvent = Pick<EventDoc, 'venue'>

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
      weekendDrop: { equals: weekendDropId as string | number },
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

export function formatPrice(event: PriceableEvent): string | null {
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
  return null
}

export function formatWhen(startAt?: string | null): string | null {
  if (!startAt) return null
  const d = new Date(startAt)

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return [
    get('weekday'),
    get('month'),
    get('day'),
    `${get('hour')}:${get('minute')} ${get('dayPeriod').replace(/\./g, '').toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(' ')
}

export function getVenueName(event: VenueLikeEvent): string | null {
  if (!event.venue || typeof event.venue !== 'object') return null
  return event.venue.name ?? null
}
