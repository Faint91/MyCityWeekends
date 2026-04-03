import OpenAI from 'openai'
import type { DiscoveryProviderResult, DiscoveredCandidate } from './types'

const openai = new OpenAI()

const OPENAI_DISCOVERY_TIMEOUT_MS = Number(process.env.OPENAI_DISCOVERY_TIMEOUT_MS ?? 300_000)

const DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    candidates: {
      type: 'array',
      maxItems: 10,
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

const TRAILING_PAREN_SUFFIX = /\s+\(([^)]+)\)\s*$/

function normalizeCandidateTitle(value: unknown): string | undefined {
  const cleaned = cleanString(value)
  if (!cleaned) return undefined

  let title = cleaned

  // Remove trailing parenthetical venue-like suffixes
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

  // Remove trailing festival/tour/series branding after a dash
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

function toCandidate(value: Record<string, unknown>): DiscoveredCandidate {
  return {
    title: normalizeCandidateTitle(value.title) ?? 'Untitled event',
    city: cleanString(value.city) ?? 'Vancouver, BC',
    description: normalizeDescription(value.description),
    startAt: cleanString(value.startAt),
    endAt: cleanString(value.endAt),
    isFree: typeof value.isFree === 'boolean' ? value.isFree : undefined,
    priceMin: typeof value.priceMin === 'number' ? value.priceMin : undefined,
    priceMax: typeof value.priceMax === 'number' ? value.priceMax : undefined,
    currency: value.currency === 'USD' ? 'USD' : value.currency === 'CAD' ? 'CAD' : undefined,
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
    sectionSuggestion:
      value.sectionSuggestion === 'top3' ||
      value.sectionSuggestion === 'free' ||
      value.sectionSuggestion === 'under15' ||
      value.sectionSuggestion === 'under30'
        ? value.sectionSuggestion
        : undefined,
    rankSuggestion: typeof value.rankSuggestion === 'number' ? value.rankSuggestion : undefined,
    confidenceScore: typeof value.confidenceScore === 'number' ? value.confidenceScore : undefined,
  }
}

export async function discoverWithOpenAIWeb(input: {
  city: string
  weekendStart: string
  weekendEnd: string
}): Promise<DiscoveryProviderResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const model = process.env.OPENAI_DISCOVERY_MODEL ?? 'gpt-5'
  const promptVersion = 'openai-web-v2'

  const developerPrompt = [
    'You are an event discovery analyst for MyCityWeekends.',
    'Find real events for the specified weekend and city.',
    'Prefer events that fit these categories: music, comedy, food, markets, art, community, nightlife, sports, outdoors.',
    'Return only events that look real, currently scheduled, and useful for a Metro Vancouver weekend recommendation site.',
    'Search across Metro Vancouver, not just the City of Vancouver.',
    'Include relevant events in Vancouver, Burnaby, Richmond, Surrey, North Vancouver, West Vancouver, New Westminster, Coquitlam, Port Coquitlam, Port Moody, Delta, and nearby municipalities when they are reasonable weekend options.',
    'Prefer events that are realistically reachable for someone spending the weekend in Metro Vancouver.',
    'Avoid vague recurring listings unless the exact occurrence for the requested weekend is clearly shown with date or time.',
    'Do not return multiple source pages for the same real-world event. If the same event appears on several sites, keep only the best canonical result.',
    'Prefer the official venue page, organizer page, or primary ticket page over secondary listing or aggregator pages.',
    'Prefer events with a clear source page or ticket page.',
    'Actively look for ticket price in the event description, right sidebar, purchase panel, ticket widget, order section, or linked official ticket page.',
    'If a price range is shown, return both priceMin and priceMax.',
    'Only leave price fields null after checking both the main source page and the most relevant ticket page when available.',
    'When enough good options exist, try to include at least one free or low-cost event, especially free or under15.',
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
    'Use sectionSuggestion thoughtfully: top3, free, under15, or under30.',
    'If price is unknown, leave it null.',
    'If a field is unclear, return null rather than guessing.',
  ].join(' ')

  const userPrompt = [
    `City: ${input.city}`,
    `Weekend start: ${input.weekendStart}`,
    `Weekend end: ${input.weekendEnd}`,
    'Find 3 worthwhile events for that weekend.',
    'Return structured JSON only.',
  ].join('\n')

  console.time('openai_web_discovery')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_DISCOVERY_TIMEOUT_MS)

  let response

  try {
    console.log('[discovery] Starting OpenAI web discovery request...', {
      city: input.city,
      weekendStart: input.weekendStart,
      weekendEnd: input.weekendEnd,
      model,
      timeoutMs: OPENAI_DISCOVERY_TIMEOUT_MS,
    })

    response = await openai.responses.create(
      {
        model,
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
          { role: 'developer', content: developerPrompt },
          { role: 'user', content: userPrompt },
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

    console.log('[discovery] OpenAI web discovery request completed.')
  } catch (error) {
    console.error('[discovery] OpenAI web discovery request failed:', error)

    if (error instanceof Error && /aborted/i.test(error.message)) {
      throw new Error(`OpenAI web discovery timed out after ${OPENAI_DISCOVERY_TIMEOUT_MS}ms`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
    console.timeEnd('openai_web_discovery')
  }

  const parsed = JSON.parse(response.output_text) as {
    candidates?: Array<Record<string, unknown>>
  }

  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates.map(toCandidate) : []

  return {
    source: 'openai_web',
    city: input.city,
    weekendStart: input.weekendStart,
    weekendEnd: input.weekendEnd,
    promptVersion,
    model,
    rawQuerySummary: userPrompt,
    candidates,
  }
}
