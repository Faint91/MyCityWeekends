import { durationMs, ingestionDebugError, ingestionDebugLog } from './ingestionDebugLog'
import type { DiscoverCandidateEventsResult } from './types'
import type { IngestionJobPayload } from './ingestionJobPayload'
import type { RunDiscoveryIngestionInput } from './runDiscoveryIngestion'
import { executeIngestionSectionJob } from './executeIngestionSectionJob'
import { recordIngestionSectionJobSuccess } from './recordIngestionSectionJobSuccess'
import { recordIngestionSectionJobFailure } from './recordIngestionSectionJobFailure'

type ExistingIngestionRun = {
  id: number | string
  rawQuerySummary?: string | null
}

type ProcessIngestionSectionJobDependencies = {
  runDiscovery: (input: RunDiscoveryIngestionInput) => Promise<DiscoverCandidateEventsResult>
  readIngestionRun: (id: number | string) => Promise<ExistingIngestionRun | null>
  updateIngestionRun: (id: number | string, data: Record<string, unknown>) => Promise<unknown>
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown ingestion section worker error.'
}

export async function processIngestionSectionJob(
  payload: IngestionJobPayload,
  dependencies: ProcessIngestionSectionJobDependencies,
) {
  const startedAt = Date.now()

  const meta = {
    runId: payload.runId,
    ingestionRunId: payload.ingestionRunId,
    section: payload.section,
    source: payload.source,
    city: payload.city,
  }

  ingestionDebugLog('section.process.start', meta)

  try {
    ingestionDebugLog('section.execute.start', meta)

    const execution = await executeIngestionSectionJob(payload, {
      runDiscovery: dependencies.runDiscovery,
    })

    ingestionDebugLog('section.execute.done', {
      ...meta,
      durationMs: durationMs(startedAt),
      found: execution.result.found,
      inserted: execution.result.inserted,
      duplicates: execution.result.duplicates,
      candidateIds: execution.result.candidateIds,
    })

    const recordStartedAt = Date.now()

    ingestionDebugLog('section.success-record.start', meta)

    const parentRunUpdate = await recordIngestionSectionJobSuccess(payload, execution, {
      readIngestionRun: dependencies.readIngestionRun,
      updateIngestionRun: dependencies.updateIngestionRun,
    })

    ingestionDebugLog('section.success-record.done', {
      ...meta,
      durationMs: durationMs(recordStartedAt),
      status: parentRunUpdate?.status,
      completedSections: parentRunUpdate?.completedSections,
      failedSections: parentRunUpdate?.failedSections,
      requestedSections: parentRunUpdate?.requestedSections,
    })

    ingestionDebugLog('section.process.done', {
      ...meta,
      durationMs: durationMs(startedAt),
      status: parentRunUpdate?.status,
    })

    return {
      ok: true as const,
      payload,
      execution,
      parentRunUpdate,
    }
  } catch (error) {
    ingestionDebugError('section.process.error', error, {
      ...meta,
      durationMs: durationMs(startedAt),
    })

    const recordStartedAt = Date.now()

    try {
      ingestionDebugLog('section.failure-record.start', meta)

      const parentRunFailure = await recordIngestionSectionJobFailure(payload, error, {
        readIngestionRun: dependencies.readIngestionRun,
        updateIngestionRun: dependencies.updateIngestionRun,
      })

      ingestionDebugLog('section.failure-record.done', {
        ...meta,
        durationMs: durationMs(recordStartedAt),
        status: parentRunFailure?.status,
        completedSections: parentRunFailure?.completedSections,
        failedSections: parentRunFailure?.failedSections,
        requestedSections: parentRunFailure?.requestedSections,
      })

      return {
        ok: false as const,
        payload,
        error: errorToMessage(error),
        parentRunFailure,
      }
    } catch (recordError) {
      ingestionDebugError('section.failure-record.error', recordError, {
        ...meta,
        durationMs: durationMs(recordStartedAt),
      })

      throw recordError
    }
  }
}
