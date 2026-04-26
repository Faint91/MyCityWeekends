import type { DiscoverCandidateEventsInput } from './types'
import type { IngestionSection } from './ingestionSections'

export type IngestionSource = NonNullable<DiscoverCandidateEventsInput['source']>

export type IngestionJobPayload = {
  runId: string
  ingestionRunId?: number | string
  section: IngestionSection
  city: string
  weekendStart?: string
  weekendEnd?: string
  source: IngestionSource
}

export type BuildIngestionJobPayloadsInput = {
  runId: string
  ingestionRunId?: number | string
  sections: IngestionSection[]
  city?: string
  weekendStart?: string
  weekendEnd?: string
  source?: IngestionSource
}

export function buildIngestionJobPayloads(
  input: BuildIngestionJobPayloadsInput,
): IngestionJobPayload[] {
  const uniqueSections = [...new Set(input.sections)]
  const city = input.city ?? 'Vancouver, BC'
  const source = input.source ?? 'openai_web'

  return uniqueSections.map((section) => ({
    runId: input.runId,
    ingestionRunId: input.ingestionRunId,
    section,
    city,
    weekendStart: input.weekendStart,
    weekendEnd: input.weekendEnd,
    source,
  }))
}
