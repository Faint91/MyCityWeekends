import { discoverWithOpenAIWeb } from './openaiWebProvider'
import type { CandidateEvent, Event } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import {
  areLikelyDuplicateEvents,
  buildDuplicateFingerprint,
  cleanString,
  normalizeUrl,
} from './dedupe'
import type {
  DiscoverCandidateEventsInput,
  DiscoverCandidateEventsResult,
  DiscoveredCandidate,
  DiscoveryProviderResult,
  DiscoveryQualitySummary,
  DiscoverySource,
} from './types'

const ALLOWED_TAGS = new Set([
  'music',
  'comedy',
  'sports',
  'outdoors',
  'community',
  'art',
  'food',
  'market',
  'education',
  'nightlife',
] as const)

type ExistingCandidateLookup = {
  title?: string | null
  startAt?: string | null
  venueName?: string | null
  venueAddress?: string | null
  sourceUrl?: string | null
  ticketUrl?: string | null
}

type ExistingEventLookup = {
  title?: string | null
  startAt?: string | null
  sourceUrl?: string | null
  ticketUrl?: string | null
  venueName?: string | null
  venueAddress?: string | null
}

type WritableCandidateSectionSuggestion = 'top3' | 'free' | 'under30'

function normalizeLegacyCandidateSectionSuggestion(
  section: 'top3' | 'free' | 'under15' | 'under30' | null | undefined,
): WritableCandidateSectionSuggestion | undefined {
  if (!section) return undefined
  if (section === 'under15') return 'under30'
  return section
}

const WEEKEND_DROP_TIME_ZONE = 'America/Vancouver'

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

async function ensureWeekendDrop(
  payload: import('payload').Payload,
  input: {
    city: string
    weekendStart: string
    weekendEnd: string
  },
) {
  const existing = await payload.find({
    collection: 'weekend-drops',
    draft: true,
    overrideAccess: true,
    limit: 1,
    where: {
      and: [{ city: { equals: input.city } }, { weekendStart: { equals: input.weekendStart } }],
    },
  })

  const existingDrop = existing.docs[0]
  if (existingDrop) return existingDrop

  return payload.create({
    collection: 'weekend-drops',
    draft: true,
    overrideAccess: true,
    data: {
      title: formatWeekendDropTitleFromStart(input.weekendStart),
      city: input.city,
      weekendStart: input.weekendStart,
      weekendEnd: toWeekendDropEndInclusive(input.weekendEnd),
    },
  })
}

function normalizeTag(tag: string): string | undefined {
  const normalized = cleanString(tag)?.toLowerCase()
  if (!normalized) return undefined
  return ALLOWED_TAGS.has(normalized as typeof ALLOWED_TAGS extends Set<infer T> ? T : never)
    ? normalized
    : undefined
}

const DISCOVERY_TIME_ZONE = 'America/Vancouver'

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
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

function getNextWeekendWindow(): { weekendStart: string; weekendEnd: string } {
  const now = new Date()
  const localNow = getLocalDateParts(now, DISCOVERY_TIME_ZONE)

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
      DISCOVERY_TIME_ZONE,
    ),
    weekendEnd: zonedDateTimeToUtcIso(
      {
        ...mondayLocal,
        hour: 0,
      },
      DISCOVERY_TIME_ZONE,
    ),
  }
}

function getMockDiscoveryCandidates(
  city: string,
  weekendStart: string,
  section?: DiscoverCandidateEventsInput['section'],
): DiscoveryProviderResult {
  const weekendDate = new Date(weekendStart)
  const saturday = new Date(weekendDate)
  saturday.setUTCDate(weekendDate.getUTCDate() + 1)

  const saturday18 = new Date(saturday)
  saturday18.setUTCHours(18, 0, 0, 0)

  const saturday20 = new Date(saturday)
  saturday20.setUTCHours(20, 0, 0, 0)

  const saturday11 = new Date(saturday)
  saturday11.setUTCHours(11, 0, 0, 0)

  const saturday15 = new Date(saturday)
  saturday15.setUTCHours(15, 0, 0, 0)

  const sunday19 = new Date(weekendDate)
  sunday19.setUTCDate(weekendDate.getUTCDate() + 2)
  sunday19.setUTCHours(19, 0, 0, 0)

  const sunday22 = new Date(weekendDate)
  sunday22.setUTCDate(weekendDate.getUTCDate() + 2)
  sunday22.setUTCHours(22, 0, 0, 0)

  const weekendEnd = new Date(weekendDate)
  weekendEnd.setUTCDate(weekendDate.getUTCDate() + 3)

  const candidates: DiscoveredCandidate[] = [
    {
      title: 'Sunset Food Truck Social',
      city,
      description:
        'Casual waterfront food truck meetup with local vendors and live acoustic music.',
      startAt: saturday18.toISOString(),
      endAt: saturday20.toISOString(),
      isFree: true,
      venueName: 'Canada Place',
      venueAddress: '999 Canada Pl, Vancouver, BC',
      neighborhood: 'Downtown',
      indoorOutdoor: 'outdoor',
      tags: ['food', 'community', 'music'],
      sourceName: 'Mock Discovery Feed',
      sourceUrl: 'https://example.com/mock/sunset-food-truck-social',
      ticketUrl: 'https://example.com/mock/sunset-food-truck-social',
      whyWorthItDraft: 'Easy downtown plan with food, views, and a low-friction social vibe.',
      sectionSuggestion: 'free',
      confidenceScore: 92,
    },
    {
      title: 'Indie Comedy Basement Night',
      city,
      description: 'Stand-up showcase with local comics in a small-room venue.',
      startAt: sunday19.toISOString(),
      endAt: sunday22.toISOString(),
      isFree: false,
      priceMin: 18,
      priceMax: 24,
      currency: 'CAD',
      venueName: 'Granville Basement Theatre',
      venueAddress: '850 Granville St, Vancouver, BC',
      neighborhood: 'Granville',
      indoorOutdoor: 'indoor',
      tags: ['comedy', 'nightlife'],
      sourceName: 'Mock Discovery Feed',
      sourceUrl: 'https://example.com/mock/indie-comedy-basement-night',
      ticketUrl: 'https://example.com/mock/indie-comedy-basement-night',
      whyWorthItDraft: 'Budget night-out option that still feels like a real plan.',
      sectionSuggestion: 'under30',
      confidenceScore: 88,
    },
    {
      title: 'Makers Market Pop-Up',
      city,
      description: 'Weekend market with local art, prints, ceramics, and gifts.',
      startAt: saturday11.toISOString(),
      endAt: saturday15.toISOString(),
      isFree: true,
      venueName: 'Mount Pleasant Community Hall',
      venueAddress: '1 Kingsway, Vancouver, BC',
      neighborhood: 'Mount Pleasant',
      indoorOutdoor: 'indoor',
      tags: ['market', 'art', 'community'],
      sourceName: 'Mock Discovery Feed',
      sourceUrl: 'https://example.com/mock/makers-market-pop-up',
      ticketUrl: 'https://example.com/mock/makers-market-pop-up',
      whyWorthItDraft: 'Strong daytime browse option that fits the site vibe well.',
      sectionSuggestion: 'top3',
      confidenceScore: 90,
    },
  ]

  const sectionCandidates = section
    ? candidates.filter((candidate) => candidate.sectionSuggestion === section)
    : candidates

  return {
    source: 'mock',
    city,
    weekendStart,
    weekendEnd: weekendEnd.toISOString(),
    promptVersion: section ? `mock-v1-${section}` : 'mock-v1',
    model: 'mock-provider',
    rawQuerySummary: section
      ? `Mock ${section} discovery candidates for ${city} for weekend starting ${weekendStart}.`
      : `Mock discovery candidates for ${city} for weekend starting ${weekendStart}.`,
    candidates: sectionCandidates,
  }
}

async function getProviderResult(
  input: Required<
    Pick<DiscoverCandidateEventsInput, 'source' | 'city' | 'weekendStart' | 'weekendEnd'>
  > &
    Pick<DiscoverCandidateEventsInput, 'section'>,
): Promise<DiscoveryProviderResult> {
  switch (input.source) {
    case 'openai_web':
      return discoverWithOpenAIWeb({
        city: input.city,
        weekendStart: input.weekendStart,
        weekendEnd: input.weekendEnd,
      })

    case 'mock':
    default:
      return getMockDiscoveryCandidates(input.city, input.weekendStart, input.section)
  }
}

function toExistingCandidateLookup(doc: CandidateEvent): ExistingCandidateLookup {
  return {
    title: cleanString(doc.title),
    startAt: cleanString(doc.startAt),
    venueName: cleanString(doc.venueName),
    venueAddress: cleanString(doc.venueAddress),
    sourceUrl: normalizeUrl(doc.sourceUrl),
    ticketUrl: normalizeUrl(doc.ticketUrl),
  }
}

function toExistingEventLookup(doc: Event): ExistingEventLookup {
  const venueDoc = doc.venue && typeof doc.venue === 'object' ? doc.venue : undefined

  return {
    title: cleanString(doc.title),
    startAt: cleanString(doc.startAt),
    sourceUrl: normalizeUrl(doc.sourceUrl),
    ticketUrl: normalizeUrl(doc.ticketUrl),
    venueName: cleanString(venueDoc?.name),
    venueAddress: cleanString(venueDoc?.address),
  }
}

function isDuplicateAgainstCandidates(
  candidate: DiscoveredCandidate,
  existingCandidates: ExistingCandidateLookup[],
  knownFingerprints: Set<string>,
): boolean {
  const fingerprint = buildDuplicateFingerprint(candidate)
  if (knownFingerprints.has(fingerprint)) {
    return true
  }

  return existingCandidates.some((existing) => areLikelyDuplicateEvents(candidate, existing))
}

function isDuplicateAgainstEvents(
  candidate: DiscoveredCandidate,
  existingEvents: ExistingEventLookup[],
): boolean {
  return existingEvents.some((existing) => areLikelyDuplicateEvents(candidate, existing))
}

function buildDiscoveryQualitySummary(provider: DiscoveryProviderResult): DiscoveryQualitySummary {
  return (
    provider.qualitySummary ?? {
      freeCount: provider.candidates.filter((candidate) => candidate.isFree === true).length,
      under30Count: provider.candidates.filter(
        (candidate) =>
          candidate.isFree !== true &&
          typeof candidate.priceMin === 'number' &&
          candidate.priceMin <= 30,
      ).length,
      pricedCount: provider.candidates.filter(
        (candidate) =>
          typeof candidate.priceMin === 'number' || typeof candidate.priceMax === 'number',
      ).length,
      missingPriceCount: provider.candidates.filter(
        (candidate) =>
          candidate.isFree !== true &&
          typeof candidate.priceMin !== 'number' &&
          typeof candidate.priceMax !== 'number',
      ).length,
      refillFreeUsed: false,
      refillUnder30Used: false,
    }
  )
}

function extractMetaImageUrl(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["'][^>]*>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    const value = match?.[1]?.trim()
    if (value) return value
  }

  return null
}

function extractSchemaImageUrl(html: string): string | null {
  const match = html.match(/"image"\s*:\s*"([^"]+)"/i)
  return match?.[1]?.trim() ?? null
}

function resolveImageUrl(imageUrl: string | null, pageUrl: string): string | null {
  if (!imageUrl) return null

  try {
    return new URL(imageUrl, pageUrl).toString()
  } catch {
    return null
  }
}

function looksLikeDirectImageAssetUrl(imageUrl: string | null): boolean {
  if (!imageUrl) return false

  try {
    const url = new URL(imageUrl)
    const pathname = url.pathname.toLowerCase()
    const search = url.search.toLowerCase()
    const host = url.hostname.toLowerCase()

    const hasImageExtension =
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.avif')

    const looksLikeImageCdnHost =
      /img\.evbuc\.com|images\.ctfassets\.net|cdn\.|cloudfront\.net|imgix\.net|tmimgs|ticketmaster/i.test(
        host,
      )

    const hasImageStyleQuery = /format=|fm=|auto=format|w=|q=|fit=|crop=|quality=/.test(search)

    return hasImageExtension || (looksLikeImageCdnHost && hasImageStyleQuery)
  } catch {
    return false
  }
}

function normalizeDiscoveredImageUrl(imageUrl: string | null | undefined): string | null {
  const cleaned = normalizeUrl(imageUrl)?.replace(/&amp;/g, '&') ?? null
  if (!cleaned) return null

  try {
    const url = new URL(cleaned)

    const looksNextImageProxy =
      url.pathname.includes('/_next/image') || /\/_next\/image\/?$/.test(url.pathname)

    if (looksNextImageProxy) {
      const nestedUrl = url.searchParams.get('url')?.trim()?.replace(/&amp;/g, '&') ?? null
      return looksLikeDirectImageAssetUrl(nestedUrl) ? nestedUrl : null
    }

    const normalized = url.toString()
    return looksLikeDirectImageAssetUrl(normalized) ? normalized : null
  } catch {
    return looksLikeDirectImageAssetUrl(cleaned) ? cleaned : null
  }
}

function looksUsableImageUrl(imageUrl: string | null): boolean {
  if (!imageUrl) return false
  if (/logo|avatar|icon|favicon|sprite/i.test(imageUrl)) return false

  return looksLikeDirectImageAssetUrl(imageUrl)
}

async function extractImageUrlFromPage(pageUrl: string | null | undefined): Promise<string | null> {
  const normalizedPageUrl = normalizeUrl(pageUrl)
  if (!normalizedPageUrl) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  try {
    const response = await fetch(normalizedPageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyCityWeekendsBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html')) return null

    const html = await response.text()

    const metaImage = normalizeDiscoveredImageUrl(
      resolveImageUrl(extractMetaImageUrl(html), normalizedPageUrl),
    )
    if (looksUsableImageUrl(metaImage)) return metaImage

    const schemaImage = normalizeDiscoveredImageUrl(
      resolveImageUrl(extractSchemaImageUrl(html), normalizedPageUrl),
    )
    if (looksUsableImageUrl(schemaImage)) return schemaImage

    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveCandidateImageSourceUrl(
  rawCandidate: DiscoveredCandidate,
): Promise<string | null> {
  const existing = normalizeDiscoveredImageUrl(rawCandidate.imageSourceUrl)
  if (existing) return existing

  const fromSource = normalizeDiscoveredImageUrl(
    await extractImageUrlFromPage(rawCandidate.sourceUrl),
  )
  if (fromSource) return fromSource

  const fromTicket = normalizeDiscoveredImageUrl(
    await extractImageUrlFromPage(rawCandidate.ticketUrl),
  )
  if (fromTicket) return fromTicket

  return null
}

export async function discoverCandidateEvents(
  input: DiscoverCandidateEventsInput = {},
): Promise<DiscoverCandidateEventsResult> {
  const payload = await getPayloadClient()

  const weekendWindow = getNextWeekendWindow()
  const source: DiscoverySource = input.source ?? 'mock'
  const city = cleanString(input.city) ?? 'Vancouver, BC'
  const weekendStart = cleanString(input.weekendStart) ?? weekendWindow.weekendStart
  const weekendEnd = cleanString(input.weekendEnd) ?? weekendWindow.weekendEnd
  const section = input.section
  const weekendDrop = await ensureWeekendDrop(payload, {
    city: city,
    weekendStart: weekendStart,
    weekendEnd: weekendEnd,
  })

  const run = await payload.create({
    collection: 'ingestion-runs',
    overrideAccess: true,
    data: {
      status: 'running',
      city,
      startedAt: new Date().toISOString(),
      weekendStart,
      weekendEnd,
      promptVersion: 'pending',
      model: 'pending',
      rawQuerySummary: `Starting ${source} discovery run for ${city}.`,
      candidateCount: 0,
      insertedCount: 0,
      duplicateCount: 0,
      freeCount: 0,
      under30Count: 0,
      pricedCount: 0,
      missingPriceCount: 0,
      refillFreeUsed: false,
      refillUnder30Used: false,
    },
  })

  try {
    const provider = await getProviderResult({
      source,
      city,
      weekendStart,
      weekendEnd,
      section,
    })

    const qualitySummary = buildDiscoveryQualitySummary(provider)

    const [existingCandidateResult, existingEventResult] = await Promise.all([
      payload.find({
        collection: 'candidate-events',
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'events',
        draft: true,
        limit: 1000,
        depth: 1,
        overrideAccess: true,
      }),
    ])

    const existingCandidateDocs = (existingCandidateResult.docs ?? []) as CandidateEvent[]
    const existingEventDocs = (existingEventResult.docs ?? []) as Event[]

    const existingCandidates = existingCandidateDocs.map(toExistingCandidateLookup)
    const existingEvents = existingEventDocs.map(toExistingEventLookup)
    const existingFingerprints = existingCandidateDocs
      .map((doc) => cleanString(doc.duplicateFingerprint))
      .filter((fingerprint): fingerprint is string => Boolean(fingerprint))

    const knownFingerprints = new Set<string>(existingFingerprints)

    const candidateIds: number[] = []
    let inserted = 0
    let duplicates = 0

    for (const rawCandidate of provider.candidates) {
      const title = cleanString(rawCandidate.title)
      if (!title) {
        duplicates += 1
        continue
      }

      const fingerprint = buildDuplicateFingerprint(rawCandidate)
      const duplicateCandidate = isDuplicateAgainstCandidates(
        rawCandidate,
        existingCandidates,
        knownFingerprints,
      )
      const duplicateEvent = isDuplicateAgainstEvents(rawCandidate, existingEvents)

      if (duplicateCandidate || duplicateEvent) {
        duplicates += 1
        continue
      }

      const tags =
        rawCandidate.tags
          ?.map(normalizeTag)
          .filter((tag): tag is string => Boolean(tag))
          .map((tag) => ({ tag })) ?? []

      const resolvedImageSourceUrl = await resolveCandidateImageSourceUrl(rawCandidate)

      console.info('[discovery] Candidate image URL resolved', {
        title: rawCandidate.title,
        originalImageSourceUrl: normalizeUrl(rawCandidate.imageSourceUrl),
        resolvedImageSourceUrl,
        sourceUrl: normalizeUrl(rawCandidate.sourceUrl),
        ticketUrl: normalizeUrl(rawCandidate.ticketUrl),
      })

      const created = await payload.create({
        collection: 'candidate-events',
        overrideAccess: true,
        data: {
          title,
          city: cleanString(rawCandidate.city) ?? city,
          description: cleanString(rawCandidate.description),
          startAt: cleanString(rawCandidate.startAt),
          endAt: cleanString(rawCandidate.endAt),
          isFree: rawCandidate.isFree ?? false,
          priceMin: rawCandidate.isFree ? undefined : rawCandidate.priceMin,
          priceMax: rawCandidate.isFree ? undefined : rawCandidate.priceMax,
          currency: rawCandidate.isFree ? undefined : (rawCandidate.currency ?? 'CAD'),
          venueName: cleanString(rawCandidate.venueName),
          venueAddress: cleanString(rawCandidate.venueAddress),
          venueWebsite: normalizeUrl(rawCandidate.venueWebsite),
          googleMapsUrl: normalizeUrl(rawCandidate.googleMapsUrl),
          neighborhood: cleanString(rawCandidate.neighborhood),
          indoorOutdoor: rawCandidate.indoorOutdoor ?? 'unknown',
          tags,
          sourceName: cleanString(rawCandidate.sourceName) ?? 'Discovery Pipeline',
          sourceUrl: normalizeUrl(rawCandidate.sourceUrl),
          ticketUrl: normalizeUrl(rawCandidate.ticketUrl),
          imageSourceUrl: resolvedImageSourceUrl,
          whyWorthItDraft: cleanString(rawCandidate.whyWorthItDraft),
          sectionSuggestion:
            normalizeLegacyCandidateSectionSuggestion(rawCandidate.sectionSuggestion) ?? null,
          rankSuggestion: rawCandidate.rankSuggestion,
          status: 'new',
          discoveredAt: new Date().toISOString(),
          ingestionRun: run.id,
          confidenceScore: rawCandidate.confidenceScore ?? 75,
          duplicateFingerprint: fingerprint,
        },
      })

      knownFingerprints.add(fingerprint)
      existingCandidates.push({
        title,
        startAt: cleanString(rawCandidate.startAt),
        venueName: cleanString(rawCandidate.venueName),
        venueAddress: cleanString(rawCandidate.venueAddress),
        sourceUrl: normalizeUrl(rawCandidate.sourceUrl),
        ticketUrl: normalizeUrl(rawCandidate.ticketUrl),
      })

      candidateIds.push(created.id)
      inserted += 1
    }

    await payload.update({
      collection: 'ingestion-runs',
      id: run.id,
      overrideAccess: true,
      data: {
        status: duplicates > 0 && inserted === 0 ? 'partial' : 'succeeded',
        finishedAt: new Date().toISOString(),
        promptVersion: provider.promptVersion,
        model: provider.model,
        rawQuerySummary: provider.rawQuerySummary,
        candidateCount: provider.candidates.length,
        insertedCount: inserted,
        duplicateCount: duplicates,
        freeCount: qualitySummary.freeCount,
        under30Count: qualitySummary.under30Count,
        pricedCount: qualitySummary.pricedCount,
        missingPriceCount: qualitySummary.missingPriceCount,
        refillFreeUsed: qualitySummary.refillFreeUsed,
        refillUnder30Used: qualitySummary.refillUnder30Used,
      },
    })

    console.log('[discovery] Quality summary', {
      runId: run.id,
      source,
      city,
      ...qualitySummary,
    })

    return {
      runId: run.id,
      source,
      city,
      found: provider.candidates.length,
      inserted,
      duplicates,
      candidateIds,
      weekendDropId: weekendDrop.id,
      weekendDropTitle: weekendDrop.title,
      qualitySummary,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error.'

    await payload.update({
      collection: 'ingestion-runs',
      id: run.id,
      overrideAccess: true,
      data: {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        errorSummary: message,
      },
    })

    throw error
  }
}
