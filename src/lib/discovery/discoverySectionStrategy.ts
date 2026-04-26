import type { IngestionSection } from './ingestionSections'

export type DiscoverySectionStrategy = {
  section: IngestionSection
  label: string
  description: string
  targetKind: 'free' | 'under30' | 'top3'
  shouldPersistAsSectionSuggestion: IngestionSection
  allowsWeakResultsFallback: boolean
}

const SECTION_STRATEGIES: Record<IngestionSection, DiscoverySectionStrategy> = {
  free: {
    section: 'free',
    label: 'Free',
    description: 'Discover free events only.',
    targetKind: 'free',
    shouldPersistAsSectionSuggestion: 'free',
    allowsWeakResultsFallback: true,
  },
  under30: {
    section: 'under30',
    label: 'Under $30',
    description: 'Discover budget events priced at $30 or less.',
    targetKind: 'under30',
    shouldPersistAsSectionSuggestion: 'under30',
    allowsWeakResultsFallback: true,
  },
  top3: {
    section: 'top3',
    label: 'Top 3',
    description: 'Discover the best overall curated picks for the weekend.',
    targetKind: 'top3',
    shouldPersistAsSectionSuggestion: 'top3',
    allowsWeakResultsFallback: true,
  },
}

export function getDiscoverySectionStrategy(section: IngestionSection): DiscoverySectionStrategy {
  return SECTION_STRATEGIES[section]
}

export function getDiscoverySectionStrategies(
  sections: IngestionSection[],
): DiscoverySectionStrategy[] {
  return sections.map(getDiscoverySectionStrategy)
}
