import { describe, expect, it } from 'vitest'
import {
  getDiscoverySectionStrategies,
  getDiscoverySectionStrategy,
} from '../discoverySectionStrategy'

describe('discoverySectionStrategy', () => {
  it('returns the free strategy', () => {
    expect(getDiscoverySectionStrategy('free')).toEqual({
      section: 'free',
      label: 'Free',
      description: 'Discover free events only.',
      targetKind: 'free',
      shouldPersistAsSectionSuggestion: 'free',
      allowsWeakResultsFallback: true,
    })
  })

  it('returns the under30 strategy', () => {
    expect(getDiscoverySectionStrategy('under30')).toEqual({
      section: 'under30',
      label: 'Under $30',
      description: 'Discover budget events priced at $30 or less.',
      targetKind: 'under30',
      shouldPersistAsSectionSuggestion: 'under30',
      allowsWeakResultsFallback: true,
    })
  })

  it('returns the top3 strategy', () => {
    expect(getDiscoverySectionStrategy('top3')).toEqual({
      section: 'top3',
      label: 'Top 3',
      description: 'Discover the best overall curated picks for the weekend.',
      targetKind: 'top3',
      shouldPersistAsSectionSuggestion: 'top3',
      allowsWeakResultsFallback: true,
    })
  })

  it('returns strategies in requested order', () => {
    expect(getDiscoverySectionStrategies(['under30', 'free'])).toEqual([
      {
        section: 'under30',
        label: 'Under $30',
        description: 'Discover budget events priced at $30 or less.',
        targetKind: 'under30',
        shouldPersistAsSectionSuggestion: 'under30',
        allowsWeakResultsFallback: true,
      },
      {
        section: 'free',
        label: 'Free',
        description: 'Discover free events only.',
        targetKind: 'free',
        shouldPersistAsSectionSuggestion: 'free',
        allowsWeakResultsFallback: true,
      },
    ])
  })
})
