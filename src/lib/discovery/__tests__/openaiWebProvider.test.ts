import { describe, expect, test } from 'vitest'
import type { DiscoveredCandidate } from '../types'
import { __testUtils } from '../openaiWebProvider'

function makeCandidate(overrides: Partial<DiscoveredCandidate> = {}): DiscoveredCandidate {
  const title = overrides.title ?? 'Test Event'
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return {
    title,
    city: 'Vancouver',
    description: 'Test description',
    startAt: '2026-04-25T19:00:00.000Z',
    endAt: '2026-04-25T21:00:00.000Z',
    isFree: false,
    priceMin: undefined,
    priceMax: undefined,
    currency: undefined,
    venueName: 'Test Venue',
    venueAddress: '123 Test St',
    venueWebsite: undefined,
    googleMapsUrl: undefined,
    neighborhood: 'Downtown',
    indoorOutdoor: 'indoor',
    tags: ['comedy'],
    sourceName: 'Test Source',
    sourceUrl: `https://example.com/source/${slug}`,
    ticketUrl: `https://example.com/tickets/${slug}`,
    imageSourceUrl: undefined,
    whyWorthItDraft: 'Worth it',
    sectionSuggestion: undefined,
    rankSuggestion: undefined,
    confidenceScore: 80,
    ...overrides,
  }
}

describe('openaiWebProvider helpers', () => {
  test('treats pay-what-you-can style wording as free', () => {
    expect(__testUtils.looksFreeFromText('Pay what you can entry for this community concert')).toBe(
      true,
    )

    expect(__testUtils.looksFreeFromText('Free with RSVP before 9pm')).toBe(true)

    expect(__testUtils.looksFreeFromText('Suggested donation at the door')).toBe(true)
  })

  test('extracts starting price from "starting at" text', () => {
    const pricing = __testUtils.normalizePricing({
      title: 'Comedy Night',
      description: 'Tickets starting at $18.',
      whyWorthItDraft: 'Budget comedy pick',
      isFree: null,
      priceMin: null,
      priceMax: null,
      currency: null,
      sectionSuggestion: null,
    })

    expect(pricing.isFree).toBeUndefined()
    expect(pricing.priceMin).toBe(18)
    expect(pricing.priceMax).toBeUndefined()
    expect(pricing.currency).toBe('CAD')
  })

  test('extracts min and max from price ranges', () => {
    const pricing = __testUtils.normalizePricing({
      title: 'Live Music',
      description: 'Tickets are $15-$25 depending on tier.',
      whyWorthItDraft: 'Local live music',
      isFree: null,
      priceMin: null,
      priceMax: null,
      currency: null,
      sectionSuggestion: null,
    })

    expect(pricing.priceMin).toBe(15)
    expect(pricing.priceMax).toBe(25)
    expect(pricing.currency).toBe('CAD')
  })

  test('extracts lower price from advance/door wording', () => {
    const pricing = __testUtils.normalizePricing({
      title: 'Indie Show',
      description: 'Advance $20, door $30.',
      whyWorthItDraft: 'Small venue night',
      isFree: null,
      priceMin: null,
      priceMax: null,
      currency: null,
      sectionSuggestion: null,
    })

    expect(pricing.priceMin).toBe(20)
    expect(pricing.priceMax).toBe(30)
    expect(pricing.currency).toBe('CAD')
  })

  test('normalizes legacy under15 section to under30', () => {
    const section = __testUtils.normalizeSectionSuggestion('under15', {
      isFree: false,
      priceMin: 12,
    })

    expect(section).toBe('under30')
  })

  test('infers under30 for non-free events priced at 30 or less', () => {
    const section = __testUtils.normalizeSectionSuggestion(undefined, {
      isFree: false,
      priceMin: 24,
    })

    expect(section).toBe('under30')
  })

  test('prioritizes one free and one under30 candidate first', () => {
    const candidates = [
      makeCandidate({
        title: 'Expensive Event',
        priceMin: 55,
        confidenceScore: 95,
      }),
      makeCandidate({
        title: 'Free Event',
        isFree: true,
        priceMin: undefined,
        confidenceScore: 70,
      }),
      makeCandidate({
        title: 'Budget Event',
        priceMin: 18,
        confidenceScore: 78,
      }),
    ]

    const prioritized = __testUtils.prioritizeCandidates(candidates)

    expect(prioritized[0]?.title).toBe('Free Event')
    expect(prioritized[1]?.title).toBe('Budget Event')
  })

  test('filters out non-free candidates with known price above 30 but keeps unknown-price candidates', () => {
    const candidates = [
      makeCandidate({
        title: 'Too Expensive Event',
        isFree: false,
        priceMin: 45,
        confidenceScore: 99,
      }),
      makeCandidate({
        title: 'Unknown Price Event',
        isFree: false,
        priceMin: undefined,
        priceMax: undefined,
        confidenceScore: 60,
      }),
      makeCandidate({
        title: 'Budget Event',
        isFree: false,
        priceMin: 22,
        confidenceScore: 70,
      }),
    ]

    const prioritized = __testUtils.prioritizeCandidates(candidates)

    expect(prioritized.map((candidate) => candidate.title)).not.toContain('Too Expensive Event')
    expect(prioritized.map((candidate) => candidate.title)).toContain('Unknown Price Event')
    expect(prioritized.map((candidate) => candidate.title)).toContain('Budget Event')
  })
})
