import { discoverCandidateEvents } from './discoverCandidateEvents'
import type { DiscoverCandidateEventsInput, DiscoverCandidateEventsResult } from './types'
import type { IngestionSection } from './ingestionSections'
import { normalizeIngestionSections } from './ingestionSections'

export type IngestionTrigger = 'admin' | 'api' | 'cron' | 'worker'

export type RunDiscoveryIngestionInput = DiscoverCandidateEventsInput & {
  trigger?: IngestionTrigger
  runId?: string
  section?: IngestionSection
  sections?: IngestionSection[]
}

export type RunDiscoveryIngestionContext = {
  trigger: IngestionTrigger
  runId: string | null
  sections: IngestionSection[]
}

export function buildRunDiscoveryIngestionContext(
  input: RunDiscoveryIngestionInput = {},
): RunDiscoveryIngestionContext {
  return {
    trigger: input.trigger ?? 'admin',
    runId: input.runId ?? null,
    sections: normalizeIngestionSections(input),
  }
}

function toDiscoverCandidateEventsInput(
  input: RunDiscoveryIngestionInput,
  context: RunDiscoveryIngestionContext,
): DiscoverCandidateEventsInput {
  const { trigger: _trigger, runId: _runId, sections: _sections, ...discoverInput } = input

  return {
    ...discoverInput,
    section: input.section ?? (context.sections.length === 1 ? context.sections[0] : undefined),
  }
}

export async function runDiscoveryIngestion(
  input: RunDiscoveryIngestionInput = {},
): Promise<DiscoverCandidateEventsResult> {
  const context = buildRunDiscoveryIngestionContext(input)
  void context

  return discoverCandidateEvents(toDiscoverCandidateEventsInput(input, context))
}
