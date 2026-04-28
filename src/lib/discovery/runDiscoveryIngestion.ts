import { durationMs, ingestionDebugError, ingestionDebugLog } from './ingestionDebugLog'
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
  const startedAt = Date.now()
  const context = buildRunDiscoveryIngestionContext(input)

  const meta = {
    trigger: context.trigger,
    runId: context.runId,
    sections: context.sections,
    section: input.section,
    ingestionRunId: input.ingestionRunId,
    source: input.source,
    city: input.city,
  }

  ingestionDebugLog('runDiscovery.start', meta)

  try {
    const result = await discoverCandidateEvents(toDiscoverCandidateEventsInput(input, context))

    ingestionDebugLog('runDiscovery.done', {
      ...meta,
      durationMs: durationMs(startedAt),
      found: result.found,
      inserted: result.inserted,
      duplicates: result.duplicates,
      candidateIds: result.candidateIds,
    })

    return result
  } catch (error) {
    ingestionDebugError('runDiscovery.error', error, {
      ...meta,
      durationMs: durationMs(startedAt),
    })

    throw error
  }
}
