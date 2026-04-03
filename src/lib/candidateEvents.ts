import type { Payload } from 'payload'
import { getPayloadClient } from './payload'
import { areLikelyDuplicateEvents, cleanString, normalizeUrl } from './discovery/dedupe'
import type { WeekendSection } from './weekendDrop'
import type { Event as PayloadEvent } from '@/payload-types'

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

function candidateTagsToEventTags(tags: CandidateEventDoc['tags']): EventTag[] | undefined {
  if (!Array.isArray(tags)) return undefined

  const values = tags
    .map((row) => {
      if (typeof row === 'string') return row
      if (row && typeof row === 'object') return row.tag ?? undefined
      return undefined
    })
    .map((value) => cleanString(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value))
    .filter((value): value is EventTag => isEventTag(value))

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

async function getLatestWeekendDropId(payload: Payload): Promise<ID> {
  const found = await payload.find({
    collection: 'weekend-drops',
    sort: '-weekendStart',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    draft: true,
  })

  const latest = ((found.docs ?? [])[0] as WeekendDropDoc | undefined)?.id
  if (latest === undefined || latest === null) {
    throw new Error('No weekend drop found. Create one first.')
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

  const createdEvent = await payload.create({
    collection: 'events',
    data: buildPublishedEventData(candidate, venueId),
    overrideAccess: true,
  })

  const attachToWeekendDrop = options.attachToWeekendDrop ?? true

  let weekendDropItemId: ID | undefined

  if (attachToWeekendDrop) {
    const section = options.section ?? candidate.sectionSuggestion
    if (!section) {
      throw new Error('No section provided and candidate has no sectionSuggestion.')
    }

    const whyWorthIt = cleanString(options.whyWorthIt) ?? cleanString(candidate.whyWorthItDraft)
    if (!whyWorthIt) {
      throw new Error('No whyWorthIt provided and candidate has no whyWorthItDraft.')
    }

    const weekendDropId = options.weekendDropId ?? (await getLatestWeekendDropId(payload))
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

    weekendDropItemId = createdDropItem.id
  }

  await payload.update({
    collection: 'candidate-events',
    id: candidate.id,
    data: {
      status: 'published',
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
