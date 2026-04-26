export const INGESTION_SECTIONS = ['free', 'under30', 'top3'] as const

export type IngestionSection = (typeof INGESTION_SECTIONS)[number]

export const DEFAULT_INGESTION_SECTIONS: IngestionSection[] = [...INGESTION_SECTIONS]

export function isIngestionSection(value: string): value is IngestionSection {
  return INGESTION_SECTIONS.includes(value as IngestionSection)
}

export function normalizeIngestionSections(input?: {
  section?: IngestionSection
  sections?: IngestionSection[]
}): IngestionSection[] {
  if (input?.sections?.length) {
    return [...new Set(input.sections)]
  }

  if (input?.section) {
    return [input.section]
  }

  return DEFAULT_INGESTION_SECTIONS
}
