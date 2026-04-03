import { createHash } from 'crypto'

const VANCOUVER_TIME_ZONE = 'America/Vancouver'

const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'bc',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'presented',
  'presents',
  'the',
  'to',
  'vancouver',
  'with',
])

export type DuplicateComparable = {
  title?: string | null
  startAt?: string | null
  venueName?: string | null
  venueAddress?: string | null
  sourceUrl?: string | null
  ticketUrl?: string | null
}

export function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function normalizeUrl(value: unknown): string | undefined {
  const raw = cleanString(value)
  if (!raw) return undefined

  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

function normalizeLooseText(value: unknown): string {
  return (
    cleanString(value)
      ?.normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''
  )
}

function getUniqueTokens(value: unknown, options?: { minLength?: number; stopWords?: Set<string> }): string[] {
  const minLength = options?.minLength ?? 3
  const stopWords = options?.stopWords ?? TITLE_STOP_WORDS

  const tokens = normalizeLooseText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength)
    .filter((token) => !stopWords.has(token))

  return Array.from(new Set(tokens))
}

function intersectionSize(a: readonly string[], b: readonly string[]): number {
  const setB = new Set(b)
  return a.reduce((count, token) => count + (setB.has(token) ? 1 : 0), 0)
}

function jaccardSimilarity(a: readonly string[], b: readonly string[]): number {
  const shared = intersectionSize(a, b)
  if (shared === 0) return 0

  const union = new Set([...a, ...b]).size
  return union > 0 ? shared / union : 0
}

export function getLocalDateKey(value: unknown, timeZone = VANCOUVER_TIME_ZONE): string | undefined {
  const raw = cleanString(value)
  if (!raw) return undefined

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return undefined

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function buildDuplicateFingerprint(candidate: DuplicateComparable): string {
  const parts = [
    normalizeLooseText(candidate.title),
    getLocalDateKey(candidate.startAt) ?? '',
    normalizeLooseText(candidate.venueName) || normalizeLooseText(candidate.venueAddress),
  ]

  return createHash('sha256').update(parts.join('|')).digest('hex')
}

function areUrlsEquivalent(a: unknown, b: unknown): boolean {
  const normalizedA = normalizeUrl(a)
  const normalizedB = normalizeUrl(b)

  return Boolean(normalizedA && normalizedB && normalizedA === normalizedB)
}

export function areTitlesLikelyDuplicate(a: unknown, b: unknown): boolean {
  const normalizedA = normalizeLooseText(a)
  const normalizedB = normalizeLooseText(b)

  if (!normalizedA || !normalizedB) return false
  if (normalizedA === normalizedB) return true
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) return true

  const tokensA = getUniqueTokens(normalizedA)
  const tokensB = getUniqueTokens(normalizedB)
  if (tokensA.length === 0 || tokensB.length === 0) return false

  const shared = intersectionSize(tokensA, tokensB)
  const jaccard = jaccardSimilarity(tokensA, tokensB)

  if (shared >= 3) return true
  if (shared >= 2 && jaccard >= 0.34) return true

  return false
}

export function areVenuesLikelyDuplicate(
  aName: unknown,
  bName: unknown,
  aAddress?: unknown,
  bAddress?: unknown,
): boolean {
  const normalizedNameA = normalizeLooseText(aName)
  const normalizedNameB = normalizeLooseText(bName)

  if (normalizedNameA && normalizedNameB) {
    if (normalizedNameA === normalizedNameB) return true
    if (normalizedNameA.includes(normalizedNameB) || normalizedNameB.includes(normalizedNameA)) {
      return true
    }

    const nameTokensA = getUniqueTokens(normalizedNameA)
    const nameTokensB = getUniqueTokens(normalizedNameB)
    const sharedNameTokens = intersectionSize(nameTokensA, nameTokensB)

    if (sharedNameTokens >= 2 && jaccardSimilarity(nameTokensA, nameTokensB) >= 0.5) {
      return true
    }
  }

  const normalizedAddressA = normalizeLooseText(aAddress)
  const normalizedAddressB = normalizeLooseText(bAddress)

  if (normalizedAddressA && normalizedAddressB) {
    if (normalizedAddressA === normalizedAddressB) return true
    if (
      normalizedAddressA.includes(normalizedAddressB) ||
      normalizedAddressB.includes(normalizedAddressA)
    ) {
      return true
    }
  }

  return false
}

export function areLikelyDuplicateEvents(
  candidate: DuplicateComparable,
  existing: DuplicateComparable,
): boolean {
  const candidateDateKey = getLocalDateKey(candidate.startAt)
  const existingDateKey = getLocalDateKey(existing.startAt)

  if (!candidateDateKey || !existingDateKey || candidateDateKey !== existingDateKey) {
    return false
  }

  const sameTitle = areTitlesLikelyDuplicate(candidate.title, existing.title)
  const sameVenue = areVenuesLikelyDuplicate(
    candidate.venueName,
    existing.venueName,
    candidate.venueAddress,
    existing.venueAddress,
  )

  const sameSource =
    areUrlsEquivalent(candidate.sourceUrl, existing.sourceUrl) ||
    areUrlsEquivalent(candidate.ticketUrl, existing.ticketUrl) ||
    areUrlsEquivalent(candidate.sourceUrl, existing.ticketUrl) ||
    areUrlsEquivalent(candidate.ticketUrl, existing.sourceUrl)

  return (sameVenue && sameTitle) || (sameSource && sameTitle) || (sameSource && sameVenue)
}
