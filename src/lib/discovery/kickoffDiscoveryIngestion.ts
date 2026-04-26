import { prepareIngestionKickoff, type PreparedIngestionKickoff } from './prepareIngestionKickoff'
import type { IngestionSection } from './ingestionSections'
import {
  createInitialIngestionSectionsState,
  deriveIngestionOverallStatus,
  type IngestionOverallStatus,
  type IngestionSectionsState,
} from './ingestionRunState'
import type { IngestionSource } from './ingestionJobPayload'
import type { IngestionTrigger, RunDiscoveryIngestionInput } from './runDiscoveryIngestion'

export type IngestionRunDraft = {
  runId: string
  trigger: IngestionTrigger
  status: IngestionOverallStatus
  city: string
  weekendStart?: string
  weekendEnd?: string
  source: IngestionSource
  requestedSections: IngestionSection[]
  sectionsState: IngestionSectionsState
  jobCount: number
  createdAt: string
}

export type KickoffDiscoveryIngestionLogEvent = {
  type: 'ingestion.kickoff.prepared'
  runId: string
  trigger: IngestionTrigger
  city: string
  source: IngestionSource
  sectionCount: number
  jobCount: number
}

export type KickoffDiscoveryIngestionResult = PreparedIngestionKickoff & {
  run: IngestionRunDraft
}

type KickoffDiscoveryIngestionOptions = {
  createRunId?: () => string
  now?: () => string
  logger?: (event: KickoffDiscoveryIngestionLogEvent) => void
}

export function kickoffDiscoveryIngestion(
  input: RunDiscoveryIngestionInput,
  options: KickoffDiscoveryIngestionOptions = {},
): KickoffDiscoveryIngestionResult {
  const prepared = prepareIngestionKickoff(input, {
    createRunId: options.createRunId,
  })

  const city = input.city ?? 'Vancouver, BC'
  const source = input.source ?? 'openai_web'
  const createdAt = options.now?.() ?? new Date().toISOString()
  const sectionsState = createInitialIngestionSectionsState(prepared.plan.sections)

  const run: IngestionRunDraft = {
    runId: prepared.runId,
    trigger: prepared.plan.trigger,
    status: deriveIngestionOverallStatus(sectionsState),
    city,
    weekendStart: input.weekendStart,
    weekendEnd: input.weekendEnd,
    source,
    requestedSections: prepared.plan.sections,
    sectionsState,
    jobCount: prepared.plan.jobs.length,
    createdAt,
  }

  options.logger?.({
    type: 'ingestion.kickoff.prepared',
    runId: prepared.runId,
    trigger: prepared.plan.trigger,
    city,
    source,
    sectionCount: prepared.plan.sections.length,
    jobCount: prepared.plan.jobs.length,
  })

  return {
    ...prepared,
    run,
  }
}
