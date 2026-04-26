import { describe, expect, it } from 'vitest'
import { __testUtils } from '../openaiWebProvider'

describe('openaiWebProvider section discovery helpers', () => {
  it('builds a free-specific prompt', () => {
    const prompt = __testUtils.buildSectionDiscoveryUserPrompt({
      city: 'Vancouver, BC',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      section: 'free',
    })

    expect(prompt).toContain('Discovery section: Free')
    expect(prompt).toContain('Only return events that count as free.')
    expect(prompt).toContain('Set sectionSuggestion to free')
  })

  it('builds an under30-specific prompt', () => {
    const prompt = __testUtils.buildSectionDiscoveryUserPrompt({
      city: 'Vancouver, BC',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      section: 'under30',
    })

    expect(prompt).toContain('Discovery section: Under $30')
    expect(prompt).toContain(
      'Only return non-free events whose lowest advertised price is CAD 30 or less.',
    )
    expect(prompt).toContain(
      'Do not spend time searching for obscure events if three valid candidates are already found.',
    )
    expect(prompt).toContain('Set sectionSuggestion to under30')
  })

  it('filters and labels free section candidates', () => {
    const candidates = __testUtils.prioritizeCandidatesForSection(
      [
        {
          title: 'Free Market',
          city: 'Vancouver',
          isFree: true,
          confidenceScore: 80,
        },
        {
          title: 'Paid Comedy',
          city: 'Vancouver',
          isFree: false,
          priceMin: 18,
          confidenceScore: 95,
        },
      ],
      'free',
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.title).toBe('Free Market')
    expect(candidates[0]?.sectionSuggestion).toBe('free')
  })

  it('filters and labels under30 section candidates', () => {
    const candidates = __testUtils.prioritizeCandidatesForSection(
      [
        {
          title: 'Free Market',
          city: 'Vancouver',
          isFree: true,
          confidenceScore: 99,
        },
        {
          title: 'Budget Comedy',
          city: 'Vancouver',
          isFree: false,
          priceMin: 18,
          confidenceScore: 80,
        },
        {
          title: 'Expensive Concert',
          city: 'Vancouver',
          isFree: false,
          priceMin: 60,
          confidenceScore: 95,
        },
      ],
      'under30',
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.title).toBe('Budget Comedy')
    expect(candidates[0]?.sectionSuggestion).toBe('under30')
  })

  it('labels top3 section candidates as top3', () => {
    const candidates = __testUtils.prioritizeCandidatesForSection(
      [
        {
          title: 'Distinct Festival',
          city: 'Vancouver',
          isFree: false,
          priceMin: 25,
          confidenceScore: 95,
        },
      ],
      'top3',
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.sectionSuggestion).toBe('top3')
  })
})
