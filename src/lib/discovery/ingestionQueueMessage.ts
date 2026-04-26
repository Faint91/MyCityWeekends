import type { IngestionJobPayload } from './ingestionJobPayload'

export const INGESTION_SECTION_JOB_MESSAGE_TYPE = 'ingestion.section.job' as const
export const INGESTION_QUEUE_MESSAGE_VERSION = 1 as const

export type IngestionSectionJobQueueMessage = {
  type: typeof INGESTION_SECTION_JOB_MESSAGE_TYPE
  version: typeof INGESTION_QUEUE_MESSAGE_VERSION
  job: IngestionJobPayload
}

export function buildIngestionSectionJobQueueMessage(
  job: IngestionJobPayload,
): IngestionSectionJobQueueMessage {
  return {
    type: INGESTION_SECTION_JOB_MESSAGE_TYPE,
    version: INGESTION_QUEUE_MESSAGE_VERSION,
    job,
  }
}

export function buildIngestionSectionJobQueueMessages(
  jobs: IngestionJobPayload[],
): IngestionSectionJobQueueMessage[] {
  return jobs.map(buildIngestionSectionJobQueueMessage)
}
