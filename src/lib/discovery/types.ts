import type { WeekendSection } from '@/lib/weekendDrop'
import type { IngestionSection } from './ingestionSections'

export type DiscoverySource = 'mock' | 'openai_web'

export type DiscoveryQualitySummary = {
  freeCount: number
  under30Count: number
  pricedCount: number
  missingPriceCount: number
  refillFreeUsed: boolean
  refillUnder30Used: boolean
}

export type DiscoveredCandidate = {
  title: string
  city: string
  description?: string
  startAt?: string
  endAt?: string
  isFree?: boolean
  priceMin?: number
  priceMax?: number
  currency?: 'CAD' | 'USD'
  venueName?: string
  venueAddress?: string
  venueWebsite?: string
  googleMapsUrl?: string
  neighborhood?: string
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both' | 'unknown'
  tags?: string[]
  sourceName?: string
  sourceUrl?: string
  ticketUrl?: string
  imageSourceUrl?: string
  whyWorthItDraft?: string
  sectionSuggestion?: WeekendSection
  rankSuggestion?: number
  confidenceScore?: number
}

export type DiscoveryProviderResult = {
  source: DiscoverySource
  city: string
  weekendStart?: string
  weekendEnd?: string
  promptVersion: string
  model: string
  rawQuerySummary: string
  candidates: DiscoveredCandidate[]
  qualitySummary?: DiscoveryQualitySummary
}

export type DiscoverCandidateEventsInput = {
  source?: DiscoverySource
  city?: string
  weekendStart?: string
  weekendEnd?: string
  section?: IngestionSection
  ingestionRunId?: number
}

export type DiscoverCandidateEventsResult = {
  runId: number | string
  source: DiscoverySource
  city: string
  found: number
  inserted: number
  duplicates: number
  candidateIds: number[]
  weekendDropId: number
  weekendDropTitle: string
  qualitySummary: DiscoveryQualitySummary
}
