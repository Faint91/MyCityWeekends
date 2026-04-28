import OpenAI from 'openai'
import type { IngestionSection } from './ingestionSections'
import { getDiscoverySectionStrategy } from './discoverySectionStrategy'
import type { DiscoveryProviderResult, DiscoveredCandidate } from './types'

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for openai_web discovery')
  }

  return new OpenAI({ apiKey })
}

const OPENAI_DISCOVERY_TIMEOUT_MS = Number(process.env.OPENAI_DISCOVERY_TIMEOUT_MS ?? 300_000)
const MAX_FINAL_CANDIDATES = 12
const MAX_SUPPLEMENTAL_CANDIDATES = 6

const SECTION_TARGET_COUNTS: Record<IngestionSection, number> = {
  free: 4,
  under30: 3,
  top3: 3,
}

const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    candidates: {
      type: 'array',
      maxItems: MAX_FINAL_CANDIDATES,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          city: { type: 'string' },
          description: { type: ['string', 'null'] },
          startAt: { type: ['string', 'null'] },
          endAt: { type: ['string', 'null'] },
          isFree: { type: ['boolean', 'null'] },
          priceMin: { type: ['number', 'null'] },
          priceMax: { type: ['number', 'null'] },
          currency: {
            type: ['string', 'null'],
            enum: ['CAD', 'USD', null],
          },
          venueName: { type: ['string', 'null'] },
          venueAddress: { type: ['string', 'null'] },
          venueWebsite: { type: ['string', 'null'] },
          googleMapsUrl: { type: ['string', 'null'] },
          neighborhood: { type: ['string', 'null'] },
          indoorOutdoor: {
            type: ['string', 'null'],
            enum: ['indoor', 'outdoor', 'both', 'unknown', null],
          },
          tags: {
            type: ['array', 'null'],
            items: { type: 'string' },
          },
          sourceName: { type: ['string', 'null'] },
          sourceUrl: { type: ['string', 'null'] },
          ticketUrl: { type: ['string', 'null'] },
          imageSourceUrl: { type: ['string', 'null'] },
          whyWorthItDraft: { type: ['string', 'null'] },
          sectionSuggestion: {
            type: ['string', 'null'],
            enum: ['top3', 'free', 'under15', 'under30', null],
          },
          rankSuggestion: { type: ['number', 'null'] },
          confidenceScore: { type: ['number', 'null'] },
        },
        required: [
          'title',
          'city',
          'description',
          'startAt',
          'endAt',
          'isFree',
          'priceMin',
          'priceMax',
          'currency',
          'venueName',
          'venueAddress',
          'venueWebsite',
          'googleMapsUrl',
          'neighborhood',
          'indoorOutdoor',
          'tags',
          'sourceName',
          'sourceUrl',
          'ticketUrl',
          'imageSourceUrl',
          'whyWorthItDraft',
          'sectionSuggestion',
          'rankSuggestion',
          'confidenceScore',
        ],
      },
    },
  },
  required: ['candidates'],
} as const

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function cleanNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function trimAtWordBoundary(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value

  const sliced = value.slice(0, maxChars + 1)
  const lastSpace = sliced.lastIndexOf(' ')
  const safeCut = lastSpace > 40 ? lastSpace : maxChars

  return `${sliced.slice(0, safeCut).trimEnd()}…`
}

function normalizeCity(value: unknown, fallbackCity: string): string {
  const cleaned = cleanString(value) ?? fallbackCity
  return cleaned.replace(/,\s*(bc|british columbia)\s*$/i, '').trim()
}

function normalizeUrlForDedupe(value: string | undefined): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value
      .trim()
      .replace(/[?#].*$/, '')
      .replace(/\/$/, '')
  }
}

function normalizeCandidateTitle(value: unknown): string | undefined {
  const cleaned = cleanString(value)
  if (!cleaned) return undefined

  let title = cleaned

  const parenMatch = title.match(/\s+\(([^)]+)\)\s*$/)
  if (parenMatch) {
    const suffix = parenMatch[1].trim()
    const lower = suffix.toLowerCase()
    const wordCount = suffix.split(/\s+/).length

    const looksAgeGate = /^\d{1,2}\+$/.test(suffix) || /^all ages$/i.test(suffix)
    const looksVenueLike =
      /(market|theatre|theater|centre|center|hall|gallery|museum|arena|stadium|park|island|hotel|club|cafe|casino|festival|vancouver|burnaby|surrey|richmond|north vancouver|west vancouver|new westminster|coquitlam|port moody|port coquitlam|delta)/i.test(
        lower,
      )

    if (!looksAgeGate && (looksVenueLike || wordCount >= 3)) {
      title = title.replace(/\s+\([^)]+\)\s*$/, '').trim()
    }
  }

  const dashParts = title.split(/\s+[—-]\s+/)
  if (dashParts.length >= 2) {
    const lastPart = dashParts[dashParts.length - 1].trim()
    const lowerLast = lastPart.toLowerCase()

    const looksBrandingSuffix =
      /(festival|tour|presented by|series|live at|burlesque festival|international .* festival)/i.test(
        lowerLast,
      )

    if (looksBrandingSuffix) {
      title = dashParts[0].trim()
    }
  }

  return title
}

function normalizeVenueName(value: unknown): string | undefined {
  const cleaned = cleanString(value)
  if (!cleaned) return undefined

  return cleaned.replace(/\s+\([^)]+\)\s*$/, '').trim()
}

function normalizeDescription(value: unknown): string | undefined {
  const cleaned = cleanString(value)
  if (!cleaned) return undefined

  return trimAtWordBoundary(normalizeWhitespace(cleaned), 420)
}

function normalizeWhyWorthItDraft(value: unknown): string | undefined {
  const cleaned = cleanString(value)
  if (!cleaned) return undefined

  return trimAtWordBoundary(normalizeWhitespace(cleaned), 85)
}

function collectPricingText(value: Record<string, unknown>): string {
  return [
    cleanString(value.title),
    cleanString(value.description),
    cleanString(value.whyWorthItDraft),
  ]
    .filter(Boolean)
    .join(' ')
}

function looksFreeFromText(text: string): boolean {
  return /\b(pay[-\s]?what[-\s]?you[-\s]?can|pwyc|suggested donation|donation-based|free with rsvp|free before\b|free admission|free entry|tickets? are free|admission is free|no cover|complimentary|\bfree\b)\b/i.test(
    text,
  )
}

function parsePriceNumber(value: string | undefined): number | undefined {
  if (!value) return undefined

  const parsed = Number.parseFloat(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function extractPriceSignals(text: string): {
  priceMin?: number
  priceMax?: number
} {
  const normalized = text.replace(/[\u2013\u2014]/g, '-')

  const labelledRangeMatchers = [
    /\b(?:advance|early bird)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b.*?\b(?:door|at the door)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/i,
    /\b(?:door|at the door)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b.*?\b(?:advance|early bird)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/i,
  ]

  for (const matcher of labelledRangeMatchers) {
    const match = normalized.match(matcher)
    const first = parsePriceNumber(match?.[1])
    const second = parsePriceNumber(match?.[2])

    if (first !== undefined && second !== undefined) {
      return {
        priceMin: Math.min(first, second),
        priceMax: Math.max(first, second),
      }
    }
  }

  const rangeMatchers = [
    /\$\s*(\d+(?:\.\d{1,2})?)\s*(?:-|to)\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/i,
    /\b(\d+(?:\.\d{1,2})?)\s*(?:-|to)\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:cad|dollars?)\b/i,
  ]

  for (const matcher of rangeMatchers) {
    const match = normalized.match(matcher)
    const first = parsePriceNumber(match?.[1])
    const second = parsePriceNumber(match?.[2])

    if (first !== undefined && second !== undefined) {
      return {
        priceMin: Math.min(first, second),
        priceMax: Math.max(first, second),
      }
    }
  }

  const singleMatchers = [
    /\$\s*(\d+(?:\.\d{1,2})?)\s*\+\s*fees\b/i,
    /\b(?:from|starting at|starts at|tickets? from|advance tickets? from|as low as|lowest price|admission|cover|door|door price|entry|general admission|early bird|advance tickets?|advance)\s*[:\-]?\s*\$?\s*(\d+(?:\.\d{1,2})?)\b/i,
  ]

  for (const matcher of singleMatchers) {
    const match = normalized.match(matcher)
    const priceMin = parsePriceNumber(match?.[1])

    if (priceMin !== undefined) {
      return { priceMin }
    }
  }

  return {}
}

function normalizePricing(value: Record<string, unknown>): {
  isFree?: boolean
  priceMin?: number
  priceMax?: number
  currency?: 'CAD' | 'USD'
} {
  const text = collectPricingText(value)
  const explicitIsFree = typeof value.isFree === 'boolean' ? value.isFree : undefined
  let priceMin = cleanNumber(value.priceMin)
  let priceMax = cleanNumber(value.priceMax)

  const inferredFree =
    looksFreeFromText(text) || cleanString(value.sectionSuggestion)?.toLowerCase() === 'free'

  if (explicitIsFree === true || (explicitIsFree !== false && inferredFree)) {
    return {
      isFree: true,
      priceMin: undefined,
      priceMax: undefined,
      currency: undefined,
    }
  }

  const extractedPricing = extractPriceSignals(text)

  if (priceMin === undefined) {
    priceMin = extractedPricing.priceMin
  }

  if (priceMax === undefined) {
    priceMax = extractedPricing.priceMax
  }

  if (priceMin === undefined && priceMax !== undefined) {
    priceMin = priceMax
    priceMax = undefined
  }

  if (priceMax !== undefined && priceMin !== undefined && priceMax < priceMin) {
    const normalizedMin = priceMax
    priceMax = priceMin
    priceMin = normalizedMin
  }

  const currency =
    value.currency === 'USD'
      ? 'USD'
      : value.currency === 'CAD'
        ? 'CAD'
        : priceMin !== undefined || priceMax !== undefined
          ? 'CAD'
          : undefined

  return {
    isFree: explicitIsFree,
    priceMin,
    priceMax,
    currency,
  }
}

function normalizeSectionSuggestion(
  value: unknown,
  pricing: { isFree?: boolean; priceMin?: number },
): 'top3' | 'free' | 'under15' | 'under30' | undefined {
  const explicit =
    value === 'top3' || value === 'free' || value === 'under15' || value === 'under30'
      ? value
      : undefined

  if (explicit === 'under15') return 'under30'
  if (explicit) return explicit
  if (pricing.isFree) return 'free'
  if (typeof pricing.priceMin === 'number' && pricing.priceMin <= 30) return 'under30'
  return undefined
}

function getCandidateQualityScore(candidate: DiscoveredCandidate): number {
  let score = candidate.confidenceScore ?? 0

  if (typeof candidate.rankSuggestion === 'number') {
    score += Math.max(0, 20 - candidate.rankSuggestion)
  }

  if (candidate.sourceUrl) score += 3
  if (candidate.ticketUrl) score += 2
  if (candidate.description) score += 1
  if (candidate.whyWorthItDraft) score += 1

  return score
}

function compareCandidatesByQuality(a: DiscoveredCandidate, b: DiscoveredCandidate): number {
  const scoreDelta = getCandidateQualityScore(b) - getCandidateQualityScore(a)
  if (scoreDelta !== 0) return scoreDelta

  const rankA = typeof a.rankSuggestion === 'number' ? a.rankSuggestion : Number.POSITIVE_INFINITY
  const rankB = typeof b.rankSuggestion === 'number' ? b.rankSuggestion : Number.POSITIVE_INFINITY

  if (rankA !== rankB) return rankA - rankB

  return a.title.localeCompare(b.title)
}

function getBudgetCandidateScore(candidate: DiscoveredCandidate): number {
  let score = getCandidateQualityScore(candidate)

  if (typeof candidate.priceMin === 'number') {
    score += Math.max(0, 31 - candidate.priceMin) / 10
  }

  if (candidate.priceMin !== undefined && candidate.priceMax !== undefined) {
    score += 0.5
  }

  return score
}

function compareBudgetCandidates(a: DiscoveredCandidate, b: DiscoveredCandidate): number {
  const scoreDelta = getBudgetCandidateScore(b) - getBudgetCandidateScore(a)
  if (scoreDelta !== 0) return scoreDelta

  return compareCandidatesByQuality(a, b)
}

function buildCandidateDedupeKey(candidate: DiscoveredCandidate): string {
  const canonicalUrl =
    normalizeUrlForDedupe(candidate.sourceUrl) ?? normalizeUrlForDedupe(candidate.ticketUrl)

  if (canonicalUrl) {
    return `url:${canonicalUrl}`
  }

  const title = candidate.title.toLowerCase().trim()
  const startAt = candidate.startAt?.slice(0, 16) ?? 'unknown-start'
  const venue = (candidate.venueName ?? candidate.venueAddress ?? 'unknown-venue')
    .toLowerCase()
    .trim()

  return `event:${title}|${startAt}|${venue}`
}

function dedupeCandidates(candidates: DiscoveredCandidate[]): DiscoveredCandidate[] {
  const byKey = new Map<string, DiscoveredCandidate>()

  for (const candidate of candidates) {
    const key = buildCandidateDedupeKey(candidate)
    const existing = byKey.get(key)

    if (!existing || compareCandidatesByQuality(candidate, existing) < 0) {
      byKey.set(key, candidate)
    }
  }

  return Array.from(byKey.values())
}

function isFreeCandidate(candidate: DiscoveredCandidate): boolean {
  return candidate.isFree === true
}

function isUnder30Candidate(candidate: DiscoveredCandidate): boolean {
  return (
    candidate.isFree !== true && typeof candidate.priceMin === 'number' && candidate.priceMin <= 30
  )
}

function isCandidateEligibleForPublishing(candidate: DiscoveredCandidate): boolean {
  if (candidate.isFree === true) return true

  if (typeof candidate.priceMin === 'number') {
    return candidate.priceMin <= 30
  }

  return true
}

function prioritizeCandidates(candidates: DiscoveredCandidate[]): DiscoveredCandidate[] {
  const unique = dedupeCandidates(candidates)
    .filter(isCandidateEligibleForPublishing)
    .sort(compareCandidatesByQuality)

  const selected: DiscoveredCandidate[] = []

  const bestFree = unique.find((candidate) => isFreeCandidate(candidate))
  if (bestFree) selected.push(bestFree)

  const bestUnder30 = unique
    .filter((candidate) => !selected.includes(candidate) && isUnder30Candidate(candidate))
    .sort(compareBudgetCandidates)[0]

  if (bestUnder30) selected.push(bestUnder30)

  for (const candidate of unique) {
    if (!selected.includes(candidate)) {
      selected.push(candidate)
    }
  }

  return selected.slice(0, MAX_FINAL_CANDIDATES)
}

function isCandidateForSection(candidate: DiscoveredCandidate, section: IngestionSection): boolean {
  if (section === 'free') return isFreeCandidate(candidate)
  if (section === 'under30') return isUnder30Candidate(candidate)

  return isCandidateEligibleForPublishing(candidate)
}

function prioritizeCandidatesForSection(
  candidates: DiscoveredCandidate[],
  section: IngestionSection,
): DiscoveredCandidate[] {
  const targetCount = SECTION_TARGET_COUNTS[section]

  return dedupeCandidates(candidates)
    .filter((candidate) => isCandidateForSection(candidate, section))
    .sort(section === 'under30' ? compareBudgetCandidates : compareCandidatesByQuality)
    .slice(0, targetCount)
    .map((candidate, index) => ({
      ...candidate,
      sectionSuggestion: section,
      rankSuggestion: candidate.rankSuggestion ?? index + 1,
    }))
}

function buildDiscoveryQualitySummary(
  candidates: DiscoveredCandidate[],
  options?: {
    refillFreeUsed?: boolean
    refillUnder30Used?: boolean
  },
) {
  return {
    freeCount: candidates.filter((candidate) => isFreeCandidate(candidate)).length,
    under30Count: candidates.filter((candidate) => isUnder30Candidate(candidate)).length,
    pricedCount: candidates.filter(
      (candidate) =>
        typeof candidate.priceMin === 'number' || typeof candidate.priceMax === 'number',
    ).length,
    missingPriceCount: candidates.filter(
      (candidate) =>
        candidate.isFree !== true &&
        typeof candidate.priceMin !== 'number' &&
        typeof candidate.priceMax !== 'number',
    ).length,
    refillFreeUsed: options?.refillFreeUsed ?? false,
    refillUnder30Used: options?.refillUnder30Used ?? false,
  }
}

function hasWeakDiscoveryCoverage(candidates: DiscoveredCandidate[]): boolean {
  const summary = buildDiscoveryQualitySummary(candidates)

  return candidates.length < 6 || summary.freeCount === 0 || summary.under30Count < 1
}

function buildSectionDiscoveryUserPrompt(input: {
  city: string
  weekendStart: string
  weekendEnd: string
  section: IngestionSection
}): string {
  const strategy = getDiscoverySectionStrategy(input.section)
  const targetCount = SECTION_TARGET_COUNTS[input.section]

  const baseLines = [
    `City: ${input.city}`,
    `Weekend start: ${input.weekendStart}`,
    `Weekend end: ${input.weekendEnd}`,
    `Discovery section: ${strategy.label}`,
    strategy.description,
    `Find up to ${targetCount} real, distinct events for this exact section.`,
    `Stop searching once you have ${targetCount} strong valid candidates.`,
    'Search across Metro Vancouver, not just the City of Vancouver.',
    'Prefer events with clear source pages, date/time, venue, and price information when available.',
    'Prefer official event pages, venue pages, organizer pages, Eventbrite, Showpass, TicketWeb, Ticketmaster, Do604, Vancouver Civic Theatres, and venue calendars.',
    'When available, also return a usable event image URL in imageSourceUrl, preferably the event poster or hero image.',
    'Use tags for both broad category and visual fallback category when obvious. Example: a hockey event can use tags ["sports", "hockey"]; a DJ event can use ["nightlife", "dj-dance"].',
  ]

  if (input.section === 'free') {
    return [
      ...baseLines,
      'Only return events that count as free.',
      'Treat pay-what-you-can, suggested donation, free with RSVP, and free before a certain time as free.',
      'If an event is free with a condition, set isFree to true and mention the condition in description.',
      'Set sectionSuggestion to free for every candidate.',
      'Return structured JSON only.',
    ].join('\n')
  }

  if (input.section === 'under30') {
    return [
      ...baseLines,
      'Only return non-free events whose lowest advertised price is CAD 30 or less.',
      'Exclude fully free events from this section.',
      'Prioritize quick-to-verify event types: comedy shows, small live music shows, gallery evenings, museum nights, community performances, markets with ticketed workshops, and local food events.',
      'Use price evidence from the event page, ticket widget, ticket page, sidebar, admission section, or venue calendar.',
      'For examples like "$12 + fees", "$15-$25", "$20 advance / $30 door", "admission: $10", or "starting at $15", set priceMin to the lowest advertised number and priceMax when a real range is shown.',
      'Do not spend time searching for obscure events if three valid candidates are already found.',
      'Set sectionSuggestion to under30 for every candidate.',
      'Return structured JSON only.',
    ].join('\n')
  }

  return [
    ...baseLines,
    'Return the best overall weekend picks, not just the cheapest options.',
    'Prioritize events that feel distinctive, timely, and worth featuring as a Top 3 recommendation.',
    'Avoid generic recurring listings unless the exact occurrence for the requested weekend is clearly shown.',
    'Prefer events with a strong hook, performer, theme, format, venue angle, or audience experience.',
    'Set sectionSuggestion to top3 for every candidate.',
    'Return structured JSON only.',
  ].join('\n')
}

function toCandidate(value: Record<string, unknown>, fallbackCity: string): DiscoveredCandidate {
  const pricing = normalizePricing(value)

  return {
    title: normalizeCandidateTitle(value.title) ?? 'Untitled event',
    city: normalizeCity(value.city, fallbackCity),
    description: normalizeDescription(value.description),
    startAt: cleanString(value.startAt),
    endAt: cleanString(value.endAt),
    isFree: pricing.isFree,
    priceMin: pricing.priceMin,
    priceMax: pricing.priceMax,
    currency: pricing.currency,
    venueName: normalizeVenueName(value.venueName),
    venueAddress: cleanString(value.venueAddress),
    venueWebsite: cleanString(value.venueWebsite),
    googleMapsUrl: cleanString(value.googleMapsUrl),
    neighborhood: cleanString(value.neighborhood),
    indoorOutdoor:
      value.indoorOutdoor === 'indoor' ||
      value.indoorOutdoor === 'outdoor' ||
      value.indoorOutdoor === 'both' ||
      value.indoorOutdoor === 'unknown'
        ? value.indoorOutdoor
        : undefined,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined,
    sourceName: cleanString(value.sourceName),
    sourceUrl: cleanString(value.sourceUrl),
    ticketUrl: cleanString(value.ticketUrl),
    imageSourceUrl: cleanString(value.imageSourceUrl),
    whyWorthItDraft: normalizeWhyWorthItDraft(value.whyWorthItDraft),
    sectionSuggestion: normalizeSectionSuggestion(value.sectionSuggestion, pricing),
    rankSuggestion: typeof value.rankSuggestion === 'number' ? value.rankSuggestion : undefined,
    confidenceScore: typeof value.confidenceScore === 'number' ? value.confidenceScore : undefined,
  }
}

async function runDiscoveryQuery(input: {
  model: string
  developerPrompt: string
  userPrompt: string
  label: string
  fallbackCity: string
}): Promise<DiscoveredCandidate[]> {
  console.time(`openai_web_discovery:${input.label}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_DISCOVERY_TIMEOUT_MS)

  try {
    console.log('[discovery] Starting OpenAI web discovery request...', {
      label: input.label,
      model: input.model,
      timeoutMs: OPENAI_DISCOVERY_TIMEOUT_MS,
    })

    const openai = getOpenAIClient()

    const response = await openai.responses.create(
      {
        model: input.model,
        tools: [
          {
            type: 'web_search',
            user_location: {
              type: 'approximate',
              country: 'CA',
              city: 'Vancouver',
              region: 'British Columbia',
            },
          },
        ],
        tool_choice: 'required',
        input: [
          { role: 'developer', content: input.developerPrompt },
          { role: 'user', content: input.userPrompt },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'discovered_candidates',
            strict: true,
            schema: DISCOVERY_SCHEMA,
          },
        },
      },
      {
        signal: controller.signal,
      },
    )

    console.log('[discovery] OpenAI web discovery request completed.', {
      label: input.label,
    })

    const parsed = JSON.parse(response.output_text) as {
      candidates?: Array<Record<string, unknown>>
    }

    const normalized = Array.isArray(parsed.candidates)
      ? parsed.candidates.map((candidate) => toCandidate(candidate, input.fallbackCity))
      : []

    return dedupeCandidates(normalized).sort(compareCandidatesByQuality)
  } catch (error) {
    console.error('[discovery] OpenAI web discovery request failed:', {
      label: input.label,
      error,
    })

    if (error instanceof Error && /aborted/i.test(error.message)) {
      throw new Error(`OpenAI web discovery timed out after ${OPENAI_DISCOVERY_TIMEOUT_MS}ms`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
    console.timeEnd(`openai_web_discovery:${input.label}`)
  }
}

export const __testUtils = {
  looksFreeFromText,
  normalizePricing,
  normalizeSectionSuggestion,
  isUnder30Candidate,
  prioritizeCandidates,
  prioritizeCandidatesForSection,
  buildSectionDiscoveryUserPrompt,
  toCandidate,
}

async function discoverSectionWithOpenAIWeb(input: {
  city: string
  weekendStart: string
  weekendEnd: string
  section: IngestionSection
  model: string
  developerPrompt: string
  promptVersion: string
}): Promise<DiscoveryProviderResult> {
  const userPrompt = buildSectionDiscoveryUserPrompt(input)
  const candidates = await runDiscoveryQuery({
    model: input.model,
    developerPrompt: input.developerPrompt,
    userPrompt,
    label: `${input.section}-section`,
    fallbackCity: input.city,
  })

  const finalCandidates = prioritizeCandidatesForSection(candidates, input.section)

  return {
    source: 'openai_web',
    city: input.city,
    weekendStart: input.weekendStart,
    weekendEnd: input.weekendEnd,
    promptVersion: `${input.promptVersion}-${input.section}`,
    model: input.model,
    rawQuerySummary: userPrompt,
    candidates: finalCandidates,
    qualitySummary: buildDiscoveryQualitySummary(finalCandidates, {
      refillFreeUsed: false,
      refillUnder30Used: false,
    }),
  }
}

export async function discoverWithOpenAIWeb(input: {
  city: string
  weekendStart: string
  weekendEnd: string
  section?: IngestionSection
}): Promise<DiscoveryProviderResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const model = process.env.OPENAI_DISCOVERY_MODEL ?? 'gpt-5'
  const promptVersion = 'openai-web-v8'

  const developerPrompt = [
    'You are an event discovery analyst for MyCityWeekends.',
    'Find real events for the specified weekend and city.',
    'Prefer events that fit these broad categories: music, comedy, food, market, art, community, nightlife, sports, outdoors, education.',
    'For tags, return useful lowercase slug strings.',
    'Include at least one broad tag when obvious: music, comedy, sports, outdoors, community, art, food, market, education, nightlife.',
    'Also include one granular visual tag when obvious, such as hockey, basketball, soccer, baseball, football, running, tennis, volleyball, pickleball, live-music, dj-dance, theatre, film, drinks, dance, drag, yoga, cycling, books, anime, esports, festival, family, dogs, holiday, or wellness.',
    'Use granular visual tags only when supported by the event title, description, venue, or source page. Do not guess.',
    'Return only events that look real, currently scheduled, and useful for a Metro Vancouver weekend recommendation site.',
    'Search across Metro Vancouver, not just the City of Vancouver.',
    'Include relevant events in Vancouver, Burnaby, Richmond, Surrey, North Vancouver, West Vancouver, New Westminster, Coquitlam, Port Coquitlam, Port Moody, Delta, and nearby municipalities when they are reasonable weekend options.',
    'Prefer events that are realistically reachable for someone spending the weekend in Metro Vancouver.',
    'Return 10 to 12 worthwhile candidates when possible.',
    'Avoid vague recurring listings unless the exact occurrence for the requested weekend is clearly shown with date or time.',
    'Recurring or multi-day events are valid if there is a clearly valid occurrence within the requested weekend window.',
    'Do not return multiple source pages for the same real-world event. If the same event appears on several sites, keep only the best canonical result.',
    'Prefer the official venue page, organizer page, or primary ticket page over secondary listing or aggregator pages.',
    'Prefer events with a clear source page or ticket page.',
    'Try to populate imageSourceUrl whenever a real event image is visible on the source page or ticket page.',
    'Prefer a real event photo or poster, not a logo, icon, avatar, or generic site image.',
    'Prefer the main hero image, og:image, twitter:image, event poster, or primary event artwork when available.',
    'Only use imageSourceUrl when it appears to be a direct usable image URL for that specific event.',
    'If no reliable event image is visible, return null for imageSourceUrl.',
    'City must be the real municipality for the event, such as Vancouver, Burnaby, Surrey, or Richmond. Do not default everything to Vancouver.',
    'When known, neighborhood should be specific, such as Mount Pleasant, Metrotown, Commercial Drive, or Richmond City Centre.',
    'Actively look for ticket price in the event description, right sidebar, purchase panel, ticket widget, order section, or linked official ticket page.',
    'If a price range is shown, return both priceMin and priceMax.',
    'Only leave price fields null after checking both the main source page and the most relevant ticket page when available.',
    'Treat pay-what-you-can, suggested donation, free with RSVP, and free before a certain time as free.',
    'If something is free with a condition, set isFree to true and mention the condition in description.',
    'For examples like "$12 + fees" or "starting at $15", set priceMin to the lowest advertised number and leave priceMax null unless a real range is shown.',
    'For budget discovery, actively look for terms like affordable, budget, cheap, tickets from, admission, cover, advance tickets, early bird, and door price.',
    'For under30 candidates, especially consider comedy nights, smaller live music shows, community events, markets, gallery or museum evenings, and local food events when they fit the weekend.',
    'When enough good options exist, try hard to include at least one free event and at least one non-free under30 event.',
    'description is for the event detail page.',
    'Write description in plain English as 2 to 4 factual sentences.',
    'Keep description roughly 180 to 420 characters when possible.',
    'description must mention at least one concrete detail unique to this specific event, not just the general category.',
    'Do not write a generic category description that could apply to any similar event.',
    'If the source mentions a signature hook, theme, performer, format, venue-specific angle, or audience interaction detail, include it.',
    'When known, naturally include venue or neighborhood context in the description.',
    'whyWorthItDraft is for a small event card.',
    'Write whyWorthItDraft as one very short plain-English line.',
    'Keep whyWorthItDraft under 85 characters when possible.',
    'Prefer 6 to 12 words for whyWorthItDraft.',
    'Do not repeat the event title in whyWorthItDraft.',
    'Do not use generic filler like "great vibes", "perfect for", or "something for everyone" unless it adds concrete meaning.',
    'Use sectionSuggestion thoughtfully: top3, free, or under30. Use under30 for non-free events whose lowest known price is CAD 30 or less.',
    'Use under30 only for non-free events whose lowest known price is 30 CAD or less.',
    'If price is unknown, leave it null.',
    'If a field is unclear, return null rather than guessing.',
  ].join(' ')

  if (input.section) {
    return discoverSectionWithOpenAIWeb({
      city: input.city,
      weekendStart: input.weekendStart,
      weekendEnd: input.weekendEnd,
      section: input.section,
      model,
      developerPrompt,
      promptVersion,
    })
  }

  const primaryUserPrompt = [
    `City: ${input.city}`,
    `Weekend start: ${input.weekendStart}`,
    `Weekend end: ${input.weekendEnd}`,
    'Find 6 to 8 worthwhile events for that weekend.',
    'Prefer at least one free event and one strong non-free event under CAD 30 when good options exist.',
    'Prefer real, distinct events with clear source pages and prices when available.',
    'When available, also return a usable event image URL in imageSourceUrl, preferably the event poster or hero image.',
    'Return structured JSON only.',
  ].join('\n')

  const executedPrompts: string[] = [primaryUserPrompt]

  let refillFreeUsed = false
  let refillUnder30Used = false

  let candidates = await runDiscoveryQuery({
    model,
    developerPrompt,
    userPrompt: primaryUserPrompt,
    label: 'primary',
    fallbackCity: input.city,
  })

  candidates = prioritizeCandidates(candidates)

  if (!candidates.some((candidate) => isFreeCandidate(candidate))) {
    refillFreeUsed = true
    const freeUserPrompt = [
      `City: ${input.city}`,
      `Weekend start: ${input.weekendStart}`,
      `Weekend end: ${input.weekendEnd}`,
      `Find up to ${MAX_SUPPLEMENTAL_CANDIDATES} worthwhile events for that weekend that count as free.`,
      'Treat pay-what-you-can, suggested donation, free with RSVP, and free before a certain time as free.',
      'Prefer distinct events, not duplicates of the primary results.',
      'When available, also return a usable event image URL in imageSourceUrl, preferably the event poster or hero image.',
      'Return structured JSON only.',
    ].join('\n')

    executedPrompts.push(freeUserPrompt)

    const freeCandidates = await runDiscoveryQuery({
      model,
      developerPrompt,
      userPrompt: freeUserPrompt,
      label: 'free-refill',
      fallbackCity: input.city,
    })

    candidates = prioritizeCandidates([...candidates, ...freeCandidates])
  }

  if (!candidates.some((candidate) => isUnder30Candidate(candidate))) {
    refillUnder30Used = true
    const under30UserPrompt = [
      `City: ${input.city}`,
      `Weekend start: ${input.weekendStart}`,
      `Weekend end: ${input.weekendEnd}`,
      `Find up to ${MAX_SUPPLEMENTAL_CANDIDATES} worthwhile non-free events for that weekend whose lowest advertised price is CAD 30 or less.`,
      'Exclude fully free events from this pass.',
      'Actively look for terms like affordable, budget, cheap, tickets from, admission, cover, advance tickets, early bird, and door price.',
      'Especially consider comedy nights, smaller live music shows, community events, markets, gallery or museum evenings, and local food events when they fit the weekend.',
      'For examples like "$12 + fees", "$15-$25", "$20 advance / $30 door", "admission: $10", or "starting at $15", set priceMin to the lowest advertised number and priceMax when a real range is shown.',
      'Prefer distinct events, not duplicates of the primary results.',
      'When available, also return a usable event image URL in imageSourceUrl, preferably the event poster or hero image.',
      'Return structured JSON only.',
    ].join('\n')

    executedPrompts.push(under30UserPrompt)

    const under30Candidates = await runDiscoveryQuery({
      model,
      developerPrompt,
      userPrompt: under30UserPrompt,
      label: 'under30-refill',
      fallbackCity: input.city,
    })

    candidates = prioritizeCandidates([...candidates, ...under30Candidates])
  }

  if (hasWeakDiscoveryCoverage(candidates)) {
    const weakResultsFallbackPrompt = [
      `City: ${input.city}`,
      `Weekend start: ${input.weekendStart}`,
      `Weekend end: ${input.weekendEnd}`,
      `Find up to ${MAX_SUPPLEMENTAL_CANDIDATES} additional worthwhile events for that weekend to strengthen a weak candidate set.`,
      'Prioritize event types that often produce strong free or under-$30 picks.',
      'Especially look for comedy nights, small live music shows, community events, makers markets, night markets, gallery evenings, museum evenings, cultural events, and local food pop-ups.',
      'Free events are good. Non-free events should ideally have a lowest advertised price of CAD 30 or less.',
      'Actively check for price terms like affordable, budget, cheap, tickets from, admission, cover, early bird, advance tickets, and door price.',
      'Prefer distinct events, not duplicates of the primary results.',
      'When available, also return a usable event image URL in imageSourceUrl, preferably the event poster or hero image.',
      'Return structured JSON only.',
    ].join('\n')

    executedPrompts.push(weakResultsFallbackPrompt)

    const weakResultsFallbackCandidates = await runDiscoveryQuery({
      model,
      developerPrompt,
      userPrompt: weakResultsFallbackPrompt,
      label: 'weak-results-fallback',
      fallbackCity: input.city,
    })

    candidates = prioritizeCandidates([...candidates, ...weakResultsFallbackCandidates])
  }

  const finalCandidates = prioritizeCandidates(candidates)

  return {
    source: 'openai_web',
    city: input.city,
    weekendStart: input.weekendStart,
    weekendEnd: input.weekendEnd,
    promptVersion,
    model,
    rawQuerySummary: executedPrompts.join('\n\n---\n\n'),
    candidates: finalCandidates,
    qualitySummary: buildDiscoveryQualitySummary(finalCandidates, {
      refillFreeUsed,
      refillUnder30Used,
    }),
  }
}
