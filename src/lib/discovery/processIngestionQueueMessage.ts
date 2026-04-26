import type { DiscoverCandidateEventsResult } from './types'
import type { RunDiscoveryIngestionInput } from './runDiscoveryIngestion'
import type { IngestionSectionJobQueueMessage } from './ingestionQueueMessage'
import {
  INGESTION_QUEUE_MESSAGE_VERSION,
  INGESTION_SECTION_JOB_MESSAGE_TYPE,
} from './ingestionQueueMessage'
import { isIngestionSection } from './ingestionSections'
import { processIngestionSectionJob } from './processIngestionSectionJob'

type ExistingIngestionRun = {
  id: number | string
  rawQuerySummary?: string | null
}

type ProcessIngestionQueueMessageDependencies = {
  runDiscovery: (input: RunDiscoveryIngestionInput) => Promise<DiscoverCandidateEventsResult>
  readIngestionRun: (id: number | string) => Promise<ExistingIngestionRun | null>
  updateIngestionRun: (id: number | string, data: Record<string, unknown>) => Promise<unknown>
}

type InvalidQueueMessageResult = {
  ok: false
  error: string
}

type ProcessIngestionQueueMessageResult =
  | Awaited<ReturnType<typeof processIngestionSectionJob>>
  | InvalidQueueMessageResult

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidSource(value: unknown): value is 'mock' | 'openai_web' {
  return value === 'mock' || value === 'openai_web'
}

export function parseIngestionSectionJobQueueMessage(
  value: unknown,
): IngestionSectionJobQueueMessage | null {
  if (!isRecord(value)) return null

  if (value.type !== INGESTION_SECTION_JOB_MESSAGE_TYPE) return null
  if (value.version !== INGESTION_QUEUE_MESSAGE_VERSION) return null
  if (!isRecord(value.job)) return null

  const job = value.job
  const section = typeof job.section === 'string' ? job.section : null

  if (typeof job.runId !== 'string' || !job.runId.trim()) return null
  if (!section || !isIngestionSection(section)) return null
  if (typeof job.city !== 'string' || !job.city.trim()) return null
  if (!isValidSource(job.source)) return null

  if (
    job.ingestionRunId !== undefined &&
    typeof job.ingestionRunId !== 'string' &&
    typeof job.ingestionRunId !== 'number'
  ) {
    return null
  }

  if (job.weekendStart !== undefined && typeof job.weekendStart !== 'string') return null
  if (job.weekendEnd !== undefined && typeof job.weekendEnd !== 'string') return null

  return {
    type: INGESTION_SECTION_JOB_MESSAGE_TYPE,
    version: INGESTION_QUEUE_MESSAGE_VERSION,
    job: {
      runId: job.runId,
      ingestionRunId: job.ingestionRunId,
      section,
      city: job.city,
      weekendStart: job.weekendStart,
      weekendEnd: job.weekendEnd,
      source: job.source,
    },
  }
}

export async function processIngestionQueueMessage(
  message: unknown,
  dependencies: ProcessIngestionQueueMessageDependencies,
): Promise<ProcessIngestionQueueMessageResult> {
  const parsed = parseIngestionSectionJobQueueMessage(message)

  if (!parsed) {
    return {
      ok: false,
      error: 'Invalid ingestion queue message.',
    }
  }

  return processIngestionSectionJob(parsed.job, dependencies)
}
