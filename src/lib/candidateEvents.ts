import type { Payload } from 'payload'
import { getPayloadClient } from './payload'
import { areLikelyDuplicateEvents, cleanString, normalizeUrl } from './discovery/dedupe'
import type { WeekendSection } from './weekendDrop'
import type { Event as PayloadEvent } from '@/payload-types'
import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  extractRankedImageCandidatesFromPage,
  normalizeRemoteImageUrl as normalizeSharedRemoteImageUrl,
} from './imageSourceUrls'
import {
  selectBestEventImageWithOpenAI,
  type EventImageSelectionCandidate,
} from './selectBestEventImageWithOpenAI'

type ID = number

type RelationValue = ID | { id?: ID | null } | null | undefined

type CandidateTagRow = { tag?: string | null } | string | null

type CandidateEventDoc = {
  id: ID
  title?: string | null
  description?: string | null
  startAt?: string | null
  endAt?: string | null
  isFree?: boolean | null
  priceMin?: number | null
  priceMax?: number | null
  currency?: 'CAD' | 'USD' | null
  venueName?: string | null
  venueAddress?: string | null
  venueWebsite?: string | null
  googleMapsUrl?: string | null
  neighborhood?: string | null
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both' | 'unknown' | null
  tags?: CandidateTagRow[] | null
  sourceUrl?: string | null
  ticketUrl?: string | null
  whyWorthItDraft?: string | null
  sectionSuggestion?: WeekendSection | null
  rankSuggestion?: number | null
  status?: 'new' | 'shortlisted' | 'draft_created' | 'rejected' | 'duplicate' | 'published' | null
  possibleDuplicateEvent?: RelationValue
  publishedEvent?: RelationValue
  publishedWeekendDropItem?: RelationValue
  adminNotes?: string | null
  imageSourceUrl?: string | null
}

type VenueDoc = {
  id: ID
  name?: string | null
  neighborhood?: string | null
  address?: string | null
  website?: string | null
  googleMapsUrl?: string | null
}

type EventDoc = {
  id: ID
  title?: string | null
  startAt?: string | null
  slug?: string | null
  sourceUrl?: string | null
  ticketUrl?: string | null
  venue?: RelationValue | VenueDoc
}

type WeekendDropDoc = {
  id: ID
}

type WeekendDropItemDoc = {
  id: ID
  rank?: number | null
}

type CreateDraftResult = {
  candidateId: ID
  eventId: ID
}

type PublishCandidateOptions = {
  candidateId: ID
  weekendDropId?: ID
  section?: WeekendSection
  rank?: number
  whyWorthIt?: string
  attachToWeekendDrop?: boolean
  allowDuplicateEvent?: boolean
}

type PublishCandidateResult = {
  candidateId: ID
  eventId: ID
  weekendDropItemId?: ID
}

type EventBaseData = Omit<PayloadEvent, 'id' | 'createdAt' | 'updatedAt'>

type EventDraftData = Partial<EventBaseData>

type EventCreateData = Pick<EventBaseData, 'title' | 'startAt'> &
  Partial<Omit<EventBaseData, 'title' | 'startAt'>>

const EVENT_TAGS = [
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
] as const

type EventTag = (typeof EVENT_TAGS)[number]

const GRANULAR_TAG_TO_EVENT_TAG: Partial<Record<string, EventTag>> = {
  hockey: 'sports',
  basketball: 'sports',
  soccer: 'sports',
  baseball: 'sports',
  football: 'sports',
  running: 'sports',
  tennis: 'sports',
  volleyball: 'sports',
  pickleball: 'sports',
  lacrosse: 'sports',
  rugby: 'sports',
  cycling: 'sports',
  esports: 'sports',

  'live-music': 'music',
  'dj-dance': 'nightlife',
  dance: 'art',
  drag: 'nightlife',
  karaoke: 'nightlife',

  drinks: 'food',
  theatre: 'art',
  film: 'art',
  books: 'art',
  anime: 'art',

  yoga: 'community',
  wellness: 'community',
  festival: 'community',
  family: 'community',
  dogs: 'community',
  holiday: 'community',
}

function buildGoogleMapsSearchUrl(query: string): string | undefined {
  const cleaned = cleanString(query)
  if (!cleaned) return undefined

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned)}`
}

function buildVenueGoogleMapsUrl(candidate: CandidateEventDoc): string | undefined {
  const explicit = normalizeUrl(candidate.googleMapsUrl)
  if (explicit) return explicit

  const venueName = cleanString(candidate.venueName)
  const venueAddress = cleanString(candidate.venueAddress)
  const neighborhood = cleanString(candidate.neighborhood)

  const queryParts = [venueName, venueAddress ?? neighborhood, 'Vancouver, BC'].filter(
    (value): value is string => Boolean(value),
  )

  if (queryParts.length === 0) return undefined

  return buildGoogleMapsSearchUrl(queryParts.join(', '))
}

function isEventTag(value: string): value is EventTag {
  return (EVENT_TAGS as readonly string[]).includes(value)
}

function normalizeText(value: unknown): string {
  return cleanString(value)?.toLowerCase() ?? ''
}

function relationId(value: RelationValue): ID | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && value.id !== undefined && value.id !== null) {
    return value.id
  }
  return undefined
}

function slugifyCandidateTag(value: string): string | undefined {
  const cleaned = cleanString(value)
  if (!cleaned) return undefined

  return cleaned
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function candidateTagToEventTag(value: string | undefined): EventTag | undefined {
  if (!value) return undefined

  const normalized = slugifyCandidateTag(value)
  if (!normalized) return undefined

  if (isEventTag(normalized)) {
    return normalized
  }

  return GRANULAR_TAG_TO_EVENT_TAG[normalized]
}

function candidateTagsToEventTags(tags: CandidateEventDoc['tags']): EventTag[] | undefined {
  if (!Array.isArray(tags)) return undefined

  const values = tags
    .map((row) => {
      if (typeof row === 'string') return row
      if (row && typeof row === 'object') return row.tag ?? undefined
      return undefined
    })
    .map(candidateTagToEventTag)
    .filter((value): value is EventTag => Boolean(value))

  const unique = Array.from(new Set(values))
  return unique.length > 0 ? unique : undefined
}

function buildCommonEventData(candidate: CandidateEventDoc, venueId?: number) {
  return {
    description: cleanString(candidate.description),
    endAt: cleanString(candidate.endAt),
    isFree: Boolean(candidate.isFree),
    priceMin: candidate.isFree ? null : (candidate.priceMin ?? null),
    priceMax: candidate.isFree ? null : (candidate.priceMax ?? null),
    currency: candidate.isFree ? null : (candidate.currency ?? 'CAD'),
    venue: venueId ?? null,
    neighborhood: cleanString(candidate.neighborhood),
    indoorOutdoor: candidate.indoorOutdoor ?? 'unknown',
    tags: candidateTagsToEventTags(candidate.tags) ?? null,
    sourceUrl: normalizeUrl(candidate.sourceUrl) ?? null,
    ticketUrl: normalizeUrl(candidate.ticketUrl) ?? null,
  }
}

function buildDraftEventData(candidate: CandidateEventDoc, venueId?: number): EventDraftData {
  return {
    title: cleanString(candidate.title),
    startAt: cleanString(candidate.startAt),
    ...buildCommonEventData(candidate, venueId),
  }
}

function buildPublishedEventData(candidate: CandidateEventDoc, venueId?: number): EventCreateData {
  const title = cleanString(candidate.title)
  const startAt = cleanString(candidate.startAt)

  if (!title) {
    throw new Error('Candidate is missing title.')
  }

  if (!startAt) {
    throw new Error('Candidate is missing startAt.')
  }

  return {
    title,
    startAt,
    _status: 'published',
    ...buildCommonEventData(candidate, venueId),
  }
}

function assertCandidateCanBecomeEvent(candidate: CandidateEventDoc) {
  if (!cleanString(candidate.title)) {
    throw new Error('Candidate is missing title.')
  }

  if (!cleanString(candidate.startAt)) {
    throw new Error('Candidate is missing startAt.')
  }
}

async function getCandidate(payload: Payload, candidateId: ID): Promise<CandidateEventDoc> {
  const candidate = (await payload.findByID({
    collection: 'candidate-events',
    id: candidateId,
    depth: 0,
    overrideAccess: true,
  })) as CandidateEventDoc

  if (!candidate) {
    throw new Error(`Candidate ${String(candidateId)} not found.`)
  }

  return candidate
}

async function upsertVenueFromCandidate(
  payload: Payload,
  candidate: CandidateEventDoc,
): Promise<ID | undefined> {
  const venueName = cleanString(candidate.venueName)
  if (!venueName) return undefined

  const venueAddress = cleanString(candidate.venueAddress)
  const neighborhood = cleanString(candidate.neighborhood)
  const venueWebsite = normalizeUrl(candidate.venueWebsite)
  const googleMapsUrl = buildVenueGoogleMapsUrl(candidate)

  const existing = await payload.find({
    collection: 'venues',
    where: {
      name: { equals: venueName },
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })

  const docs = (existing.docs ?? []) as VenueDoc[]

  const exactAddressMatch = venueAddress
    ? docs.find((doc) => normalizeText(doc.address) === normalizeText(venueAddress))
    : undefined

  const existingVenue = exactAddressMatch ?? docs[0]

  if (existingVenue?.id !== undefined && existingVenue?.id !== null) {
    const patch: Record<string, unknown> = {}

    if (!cleanString(existingVenue.address) && venueAddress) {
      patch.address = venueAddress
    }

    if (!cleanString(existingVenue.name) && venueName) {
      patch.name = venueName
    }

    if (
      !cleanString((existingVenue as VenueDoc & { neighborhood?: string | null }).neighborhood) &&
      neighborhood
    ) {
      patch.neighborhood = neighborhood
    }

    if (
      !cleanString((existingVenue as VenueDoc & { website?: string | null }).website) &&
      venueWebsite
    ) {
      patch.website = venueWebsite
    }

    if (
      !cleanString((existingVenue as VenueDoc & { googleMapsUrl?: string | null }).googleMapsUrl) &&
      googleMapsUrl
    ) {
      patch.googleMapsUrl = googleMapsUrl
    }

    if (Object.keys(patch).length > 0) {
      await payload.update({
        collection: 'venues',
        id: existingVenue.id,
        data: patch,
        overrideAccess: true,
      })
    }

    return existingVenue.id
  }

  const created = await payload.create({
    collection: 'venues',
    data: {
      name: venueName,
      neighborhood,
      address: venueAddress,
      website: venueWebsite,
      googleMapsUrl,
    },
    overrideAccess: true,
  })

  return created.id
}

function toEventDuplicateLookup(event: EventDoc) {
  const venueDoc =
    event.venue && typeof event.venue === 'object' && 'name' in event.venue
      ? (event.venue as VenueDoc)
      : undefined

  return {
    title: cleanString(event.title),
    startAt: cleanString(event.startAt),
    sourceUrl: normalizeUrl(event.sourceUrl),
    ticketUrl: normalizeUrl(event.ticketUrl),
    venueName: cleanString(venueDoc?.name),
    venueAddress: cleanString(venueDoc?.address),
  }
}

async function findMatchingExistingEvent(
  payload: Payload,
  candidate: CandidateEventDoc,
): Promise<EventDoc | null> {
  const title = cleanString(candidate.title)
  const startAt = cleanString(candidate.startAt)

  if (!title || !startAt) return null

  const found = await payload.find({
    collection: 'events',
    limit: 1000,
    depth: 1,
    overrideAccess: true,
    draft: true,
  })

  const match = (found.docs as EventDoc[]).find((event) =>
    areLikelyDuplicateEvents(
      {
        title: candidate.title,
        startAt: candidate.startAt,
        venueName: candidate.venueName,
        venueAddress: candidate.venueAddress,
        sourceUrl: candidate.sourceUrl,
        ticketUrl: candidate.ticketUrl,
      },
      toEventDuplicateLookup(event),
    ),
  )

  return match ?? null
}

async function getLatestPublishedWeekendDropId(payload: Payload): Promise<ID> {
  const found = await payload.find({
    collection: 'weekend-drops',
    where: {
      _status: { equals: 'published' },
    },
    sort: '-weekendStart',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    draft: false,
  })

  const latest = ((found.docs ?? [])[0] as WeekendDropDoc | undefined)?.id
  if (latest === undefined || latest === null) {
    throw new Error('No published weekend drop found. Publish one first.')
  }

  return latest
}

async function getNextRankForSection(
  payload: Payload,
  weekendDropId: ID,
  section: WeekendSection,
): Promise<number> {
  const found = await payload.find({
    collection: 'weekend-drop-items',
    where: {
      weekendDrop: { equals: weekendDropId },
      section: { equals: section },
    },
    sort: '-rank',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const top = ((found.docs ?? [])[0] as WeekendDropItemDoc | undefined)?.rank ?? 0
  return top + 1
}

function appendAdminNote(existing: string | null | undefined, note: string): string {
  const current = cleanString(existing)
  if (!current) return note
  return `${current}\n${note}`
}

function getImageExtensionFromContentType(contentType: string | null): string | null {
  const normalized = contentType?.split(';')[0].trim().toLowerCase() ?? null

  switch (normalized) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    default:
      return null
  }
}

function getImageExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase()

    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return '.jpg'
    if (pathname.endsWith('.png')) return '.png'
    if (pathname.endsWith('.webp')) return '.webp'

    return null
  } catch {
    return null
  }
}

async function importRemoteCandidateImageToMedia(input: {
  payload: Payload
  imageUrl: string | null | undefined
  alt: string
}): Promise<number | null> {
  const originalImageUrl = cleanString(input.imageUrl)
  const imageUrl = normalizeSharedRemoteImageUrl(originalImageUrl)

  if (!imageUrl) {
    console.warn('[candidate-events] Skipping image import because imageUrl is empty', {
      originalImageUrl,
    })
    return null
  }

  let tempFilePath: string | null = null

  try {
    console.info('[candidate-events] Attempting remote image import', {
      originalImageUrl,
      normalizedImageUrl: imageUrl,
      alt: input.alt,
    })

    const response = await fetch(imageUrl, {
      redirect: 'follow',
      headers: {
        Accept: 'image/jpeg,image/png,image/webp,image/avif,image/*;q=0.8,*/*;q=0.5',
        'User-Agent': 'Mozilla/5.0 (compatible; MyCityWeekendsBot/1.0)',
      },
    })

    const finalUrl = response.url
    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')

    console.info('[candidate-events] Remote image response received', {
      requestedUrl: imageUrl,
      finalUrl,
      status: response.status,
      ok: response.ok,
      contentType,
      contentLength,
    })

    if (!response.ok) {
      console.warn('[candidate-events] Failed to download candidate image', {
        requestedUrl: imageUrl,
        finalUrl,
        status: response.status,
        contentType,
      })
      return null
    }

    const ext =
      getImageExtensionFromContentType(contentType) ??
      getImageExtensionFromUrl(finalUrl) ??
      getImageExtensionFromUrl(imageUrl)

    if (!ext) {
      console.warn('[candidate-events] Unsupported candidate image content type', {
        requestedUrl: imageUrl,
        finalUrl,
        contentType,
      })
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.info('[candidate-events] Remote image downloaded', {
      requestedUrl: imageUrl,
      finalUrl,
      bytes: buffer.length,
      ext,
    })

    if (buffer.length < 5_000) {
      console.warn('[candidate-events] Candidate image too small, skipping', {
        requestedUrl: imageUrl,
        finalUrl,
        bytes: buffer.length,
      })
      return null
    }

    tempFilePath = path.join(os.tmpdir(), `mcw-candidate-image-${crypto.randomUUID()}${ext}`)
    await fs.writeFile(tempFilePath, buffer)

    console.info('[candidate-events] Temporary image file written', {
      requestedUrl: imageUrl,
      finalUrl,
      tempFilePath,
    })

    const mediaDoc = await input.payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: input.alt,
      },
      filePath: tempFilePath,
    })

    const mediaId = typeof mediaDoc.id === 'number' ? mediaDoc.id : Number(mediaDoc.id)

    console.info('[candidate-events] Media created from remote image', {
      requestedUrl: imageUrl,
      finalUrl,
      mediaId,
    })

    return mediaId
  } catch (error) {
    console.warn('[candidate-events] Error importing candidate image', {
      requestedUrl: imageUrl,
      error,
    })
    return null
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => null)
    }
  }
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

function normalizeRemoteImageUrl(imageUrl: string | null | undefined): string | null {
  const cleaned = cleanString(imageUrl)?.replace(/&amp;/g, '&') ?? null
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
      /img\.evbuc\.com|images\.ctfassets\.net|cdn\.|cloudfront\.net|imgix\.net|ticketmaster|tmimgs/i.test(
        host,
      )

    const hasImageStyleQuery = /format=|fm=|auto=format|w=|q=|fit=|crop=|quality=/.test(search)

    return hasImageExtension || (looksLikeImageCdnHost && hasImageStyleQuery)
  } catch {
    return false
  }
}

function looksUsableImageUrl(imageUrl: string | null): boolean {
  if (!imageUrl) return false
  if (/logo|avatar|icon|favicon|sprite/i.test(imageUrl)) return false

  return looksLikeDirectImageAssetUrl(imageUrl)
}

async function extractImageUrlFromPageForPublish(
  pageUrl: string | null | undefined,
): Promise<string | null> {
  const normalizedPageUrl = cleanString(pageUrl)
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

    const metaImage = resolveImageUrl(extractMetaImageUrl(html), normalizedPageUrl)
    if (looksUsableImageUrl(metaImage)) return metaImage

    const schemaImage = resolveImageUrl(extractSchemaImageUrl(html), normalizedPageUrl)
    if (looksUsableImageUrl(schemaImage)) return schemaImage

    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function dedupeImageSelectionCandidates(
  candidates: EventImageSelectionCandidate[],
): EventImageSelectionCandidate[] {
  const seen = new Set<string>()
  const unique: EventImageSelectionCandidate[] = []

  for (const candidate of candidates) {
    const imageUrl = normalizeSharedRemoteImageUrl(candidate.url)
    if (!imageUrl || seen.has(imageUrl)) continue

    seen.add(imageUrl)
    unique.push({
      ...candidate,
      url: imageUrl,
    })
  }

  return unique
}

async function importBestCandidateImageToMedia(input: {
  payload: Payload
  imageUrl: string | null | undefined
  sourceUrl: string | null | undefined
  ticketUrl: string | null | undefined
  alt: string
  title?: string | null
  description?: string | null
}): Promise<number | null> {
  const imageSearchOptions = {
    eventTitle: input.title ?? input.alt,
    eventDescription: input.description ?? null,
  }

  const directImageUrl = normalizeSharedRemoteImageUrl(input.imageUrl)

  const sourcePageCandidates = await extractRankedImageCandidatesFromPage(
    input.sourceUrl,
    imageSearchOptions,
  )

  const shouldCheckTicketPage =
    cleanString(input.ticketUrl) && normalizeUrl(input.ticketUrl) !== normalizeUrl(input.sourceUrl)

  const ticketPageCandidates = shouldCheckTicketPage
    ? await extractRankedImageCandidatesFromPage(input.ticketUrl, imageSearchOptions)
    : []

  const imageCandidates = dedupeImageSelectionCandidates([
    ...(directImageUrl
      ? [
          {
            url: directImageUrl,
            source: 'candidate.imageSourceUrl',
            score: 1_000,
            context: 'Image URL returned directly by discovery provider.',
          },
        ]
      : []),
    ...sourcePageCandidates.map((candidate) => ({
      url: candidate.url,
      source: `sourceUrl.${candidate.source}`,
      score: candidate.score,
      context: candidate.context,
    })),
    ...ticketPageCandidates.map((candidate) => ({
      url: candidate.url,
      source: `ticketUrl.${candidate.source}`,
      score: candidate.score,
      context: candidate.context,
    })),
  ])

  const openAISelection = await selectBestEventImageWithOpenAI({
    title: input.title ?? input.alt,
    description: input.description ?? null,
    sourceUrl: cleanString(input.sourceUrl) ?? cleanString(input.ticketUrl) ?? null,
    candidates: imageCandidates.slice(0, 6),
  })

  const selectedUrl = openAISelection.selectedUrl
    ? normalizeSharedRemoteImageUrl(openAISelection.selectedUrl)
    : null

  const orderedUrls = [selectedUrl, ...imageCandidates.map((candidate) => candidate.url)].filter(
    (value): value is string => Boolean(value),
  )

  const uniqueUrls = Array.from(new Set(orderedUrls))

  console.info('[candidate-events] Candidate image import sources resolved', {
    directImageUrl,
    sourceUrl: cleanString(input.sourceUrl),
    sourcePageCandidateCount: sourcePageCandidates.length,
    ticketUrl: cleanString(input.ticketUrl),
    ticketPageCandidateCount: ticketPageCandidates.length,
    totalUniqueUrls: uniqueUrls.length,
    openAISelectedUrl: selectedUrl,
    openAISelectionReason: openAISelection.reason,
    openAISelectionModel: openAISelection.model,
    topImageCandidates: imageCandidates.slice(0, 6).map((candidate) => ({
      url: candidate.url,
      source: candidate.source,
      score: candidate.score,
    })),
    rejectedDirectImageUrl:
      cleanString(input.imageUrl) && !directImageUrl ? cleanString(input.imageUrl) : null,
  })

  for (const imageUrl of uniqueUrls) {
    console.info('[candidate-events] Trying candidate image URL', {
      imageUrl,
      selectedByOpenAI: imageUrl === selectedUrl,
    })

    const importedImageId = await importRemoteCandidateImageToMedia({
      payload: input.payload,
      imageUrl,
      alt: input.alt,
    })

    if (importedImageId) {
      console.info('[candidate-events] Candidate image import succeeded', {
        imageUrl,
        selectedByOpenAI: imageUrl === selectedUrl,
        mediaId: importedImageId,
      })
      return importedImageId
    }

    console.warn('[candidate-events] Candidate image import attempt failed', {
      imageUrl,
      selectedByOpenAI: imageUrl === selectedUrl,
    })
  }

  console.warn('[candidate-events] No candidate image source could be imported', {
    directImageUrl,
    sourceUrl: cleanString(input.sourceUrl),
    ticketUrl: cleanString(input.ticketUrl),
    openAISelectionReason: openAISelection.reason,
  })

  return null
}

type WritableWeekendSection = 'top3' | 'free' | 'under30'

function normalizeLegacyWeekendSection(
  section: WeekendSection | null | undefined,
): WritableWeekendSection | undefined {
  if (!section) return undefined
  if (section === 'under15') return 'under30'
  return section
}

export async function createDraftEventFromCandidate(candidateId: ID): Promise<CreateDraftResult> {
  const payload = await getPayloadClient()
  const candidate = await getCandidate(payload, candidateId)

  assertCandidateCanBecomeEvent(candidate)

  if (candidate.status === 'published') {
    throw new Error('This candidate is already published.')
  }

  const duplicate = await findMatchingExistingEvent(payload, candidate)
  if (duplicate) {
    throw new Error(
      `A matching event already exists (id: ${String(duplicate.id)}). Use that event instead of creating a new draft.`,
    )
  }

  const venueId = await upsertVenueFromCandidate(payload, candidate)

  const createdEvent = await payload.create({
    collection: 'events',
    data: buildDraftEventData(candidate, venueId),
    draft: true,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'candidate-events',
    id: candidate.id,
    data: {
      status: 'draft_created',
      adminNotes: appendAdminNote(
        candidate.adminNotes,
        `Draft event created: ${String(createdEvent.id)}`,
      ),
    },
    overrideAccess: true,
  })

  return {
    candidateId: candidate.id,
    eventId: createdEvent.id,
  }
}

export async function publishCandidateEvent(
  options: PublishCandidateOptions,
): Promise<PublishCandidateResult> {
  const payload = await getPayloadClient()
  const candidate = await getCandidate(payload, options.candidateId)

  assertCandidateCanBecomeEvent(candidate)

  if (candidate.status === 'published') {
    const existingPublishedEventId = relationId(candidate.publishedEvent)
    const existingDropItemId = relationId(candidate.publishedWeekendDropItem)

    if (existingPublishedEventId === undefined) {
      throw new Error('Candidate is already published but publishedEvent is missing.')
    }

    return {
      candidateId: candidate.id,
      eventId: existingPublishedEventId,
      weekendDropItemId: existingDropItemId,
    }
  }

  if (!options.allowDuplicateEvent) {
    const flaggedDuplicateId = relationId(candidate.possibleDuplicateEvent)
    if (flaggedDuplicateId !== undefined) {
      throw new Error(
        `Candidate is flagged as a possible duplicate of event ${String(flaggedDuplicateId)}.`,
      )
    }

    const exactDuplicate = await findMatchingExistingEvent(payload, candidate)
    if (exactDuplicate) {
      throw new Error(`A matching event already exists (id: ${String(exactDuplicate.id)}).`)
    }
  }

  const venueId = await upsertVenueFromCandidate(payload, candidate)

  let createdEvent = await payload.create({
    collection: 'events',
    data: buildPublishedEventData(candidate, venueId),
    overrideAccess: true,
  })

  const attachToWeekendDrop = options.attachToWeekendDrop ?? true

  let weekendDropItemId: ID | undefined

  if (attachToWeekendDrop) {
    const rawSection = options.section ?? candidate.sectionSuggestion
    const section = normalizeLegacyWeekendSection(rawSection)

    if (!section) {
      throw new Error('No section provided and candidate has no sectionSuggestion.')
    }

    const whyWorthIt = cleanString(options.whyWorthIt) ?? cleanString(candidate.whyWorthItDraft)
    if (!whyWorthIt) {
      throw new Error('No whyWorthIt provided and candidate has no whyWorthItDraft.')
    }

    const weekendDropId = options.weekendDropId ?? (await getLatestPublishedWeekendDropId(payload))
    const rank =
      options.rank ??
      candidate.rankSuggestion ??
      (await getNextRankForSection(payload, weekendDropId, section))

    const createdDropItem = await payload.create({
      collection: 'weekend-drop-items',
      data: {
        weekendDrop: weekendDropId,
        event: createdEvent.id,
        section,
        rank,
        whyWorthIt,
      },
      overrideAccess: true,
    })

    let importedImageId: number | null = null
    let imageImportFailed = false

    try {
      console.info('[candidate-events] Starting image attach during publish', {
        candidateId: candidate.id,
        title: cleanString(candidate.title) ?? null,
        imageSourceUrl: cleanString(candidate.imageSourceUrl) ?? null,
        sourceUrl: cleanString(candidate.sourceUrl) ?? null,
        ticketUrl: cleanString(candidate.ticketUrl) ?? null,
      })

      importedImageId = await importBestCandidateImageToMedia({
        payload,
        imageUrl: candidate.imageSourceUrl,
        sourceUrl: candidate.sourceUrl,
        ticketUrl: candidate.ticketUrl,
        alt: cleanString(candidate.title) ?? 'Event image',
        title: cleanString(candidate.title) ?? null,
        description: cleanString(candidate.description) ?? null,
      })
    } catch (error) {
      imageImportFailed = true

      console.warn('[candidate-events] Unexpected image attach error during publish', {
        candidateId: candidate.id,
        error,
      })
    }

    if (importedImageId) {
      createdEvent = await payload.update({
        collection: 'events',
        id: createdEvent.id,
        overrideAccess: true,
        data: {
          image: importedImageId,
        },
      })
    } else if (imageImportFailed || cleanString(candidate.imageSourceUrl)) {
      await payload.update({
        collection: 'candidate-events',
        id: candidate.id,
        overrideAccess: true,
        data: {
          adminNotes: appendAdminNote(candidate.adminNotes, 'Image import failed during publish.'),
        },
      })
    }
    weekendDropItemId = createdDropItem.id
  }

  const normalizedSectionSuggestion =
    normalizeLegacyWeekendSection(candidate.sectionSuggestion) ?? null

  await payload.update({
    collection: 'candidate-events',
    id: candidate.id,
    data: {
      status: 'published',
      sectionSuggestion: normalizedSectionSuggestion,
      publishedEvent: createdEvent.id,
      publishedWeekendDropItem: weekendDropItemId ?? null,
      adminNotes: appendAdminNote(
        candidate.adminNotes,
        `Published event: ${String(createdEvent.id)}${
          weekendDropItemId !== undefined ? ` | WeekendDropItem: ${String(weekendDropItemId)}` : ''
        }`,
      ),
    },
    overrideAccess: true,
  })

  return {
    candidateId: candidate.id,
    eventId: createdEvent.id,
    weekendDropItemId,
  }
}
