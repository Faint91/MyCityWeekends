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
  try {
    const execution = await executeIngestionSectionJob(payload, {
      runDiscovery: dependencies.runDiscovery,
    })

    const parentRunUpdate = await recordIngestionSectionJobSuccess(payload, execution, {
      readIngestionRun: dependencies.readIngestionRun,
      updateIngestionRun: dependencies.updateIngestionRun,
    })

    return {
      ok: true as const,
      payload,
      execution,
      parentRunUpdate,
    }
  } catch (error) {
    const parentRunFailure = await recordIngestionSectionJobFailure(payload, error, {
      readIngestionRun: dependencies.readIngestionRun,
      updateIngestionRun: dependencies.updateIngestionRun,
    })

    return {
      ok: false as const,
      payload,
      error: errorToMessage(error),
      parentRunFailure,
    }
  }
}
