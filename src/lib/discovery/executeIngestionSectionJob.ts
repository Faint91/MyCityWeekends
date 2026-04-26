import type { DiscoverCandidateEventsResult } from './types'
import type { IngestionJobPayload } from './ingestionJobPayload'
import type { RunDiscoveryIngestionInput } from './runDiscoveryIngestion'

export type ExecuteIngestionSectionJobResult = {
  runId: string
  section: IngestionJobPayload['section']
  trigger: 'worker'
  result: DiscoverCandidateEventsResult
}

type ExecuteIngestionSectionJobOptions = {
  runDiscovery: (input: RunDiscoveryIngestionInput) => Promise<DiscoverCandidateEventsResult>
}

export async function executeIngestionSectionJob(
  payload: IngestionJobPayload,
  options: ExecuteIngestionSectionJobOptions,
): Promise<ExecuteIngestionSectionJobResult> {
  const result = await options.runDiscovery({
    trigger: 'worker',
    runId: payload.runId,
    section: payload.section,
    city: payload.city,
    weekendStart: payload.weekendStart,
    weekendEnd: payload.weekendEnd,
    source: payload.source,
  })

  return {
    runId: payload.runId,
    section: payload.section,
    trigger: 'worker',
    result,
  }
}
