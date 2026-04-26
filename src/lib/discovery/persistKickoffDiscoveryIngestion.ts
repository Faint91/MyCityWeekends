import {
  kickoffDiscoveryIngestion,
  type KickoffDiscoveryIngestionLogEvent,
  type KickoffDiscoveryIngestionResult,
} from './kickoffDiscoveryIngestion'
import type { RunDiscoveryIngestionInput } from './runDiscoveryIngestion'

import type { IngestionRun } from '@/payload-types'

type CreateIngestionRunArgs = {
  status: NonNullable<IngestionRun['status']>
  city: string
  startedAt: string
  weekendStart?: string
  weekendEnd?: string
  promptVersion: string
  model: string
  rawQuerySummary: string
  candidateCount: number
  insertedCount: number
  duplicateCount: number
}

type CreateIngestionRunResult = {
  id: number | string
  status?: string | null
}

export type PersistKickoffDiscoveryIngestionResult = KickoffDiscoveryIngestionResult & {
  persistedRun: {
    id: number | string
    status: string | null | undefined
  }
  persistedJobs: KickoffDiscoveryIngestionResult['plan']['jobs']
}

type PersistKickoffDiscoveryIngestionOptions = {
  createRunId?: () => string
  now?: () => string
  logger?: (event: KickoffDiscoveryIngestionLogEvent) => void
  createIngestionRun: (args: CreateIngestionRunArgs) => Promise<CreateIngestionRunResult>
  previewOnly?: boolean
  promptVersion?: string
}

export async function persistKickoffDiscoveryIngestion(
  input: RunDiscoveryIngestionInput,
  options: PersistKickoffDiscoveryIngestionOptions,
): Promise<PersistKickoffDiscoveryIngestionResult> {
  const prepared = kickoffDiscoveryIngestion(input, options)

  const previewOnly = options.previewOnly ?? true
  const promptVersion =
    options.promptVersion ?? (previewOnly ? 'kickoff-preview-v1' : 'queue-kickoff-v1')

  const created = await options.createIngestionRun({
    status: 'running',
    city: prepared.run.city,
    startedAt: prepared.run.createdAt,
    weekendStart: prepared.run.weekendStart,
    weekendEnd: prepared.run.weekendEnd,
    promptVersion,
    model: prepared.run.source,
    rawQuerySummary: JSON.stringify({
      runId: prepared.runId,
      trigger: prepared.run.trigger,
      requestedSections: prepared.run.requestedSections,
      jobCount: prepared.run.jobCount,
      previewOnly,
    }),
    candidateCount: 0,
    insertedCount: 0,
    duplicateCount: 0,
  })

  return {
    ...prepared,
    persistedRun: {
      id: created.id,
      status: typeof created.status === 'string' ? created.status : (created.status ?? null),
    },
    persistedJobs: prepared.plan.jobs.map((job) => ({
      ...job,
      ingestionRunId: created.id,
    })),
  }
}
