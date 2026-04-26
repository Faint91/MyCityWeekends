import type { IngestionJobPayload } from './ingestionJobPayload'
import type { IngestionSection } from './ingestionSections'
import {
  buildIngestionSectionJobQueueMessage,
  type IngestionSectionJobQueueMessage,
} from './ingestionQueueMessage'

export type IngestionRunProgress = {
  requestedSections: IngestionSection[]
  completedSections: IngestionSection[]
  failedSections: IngestionSection[]
}

export function buildNextIngestionQueueMessage(
  payload: IngestionJobPayload,
  progress: IngestionRunProgress | null,
): IngestionSectionJobQueueMessage | null {
  if (!progress) return null

  const finishedSections = new Set([...progress.completedSections, ...progress.failedSections])

  const nextSection = progress.requestedSections.find((section) => !finishedSections.has(section))

  if (!nextSection) return null

  return buildIngestionSectionJobQueueMessage({
    ...payload,
    section: nextSection,
  })
}
