import {
  persistKickoffDiscoveryIngestion,
  type PersistKickoffDiscoveryIngestionResult,
} from './persistKickoffDiscoveryIngestion'
import {
  buildIngestionSectionJobQueueMessages,
  type IngestionSectionJobQueueMessage,
} from './ingestionQueueMessage'
import {
  noopIngestionQueuePublisher,
  type IngestionQueuePublisher,
  type PublishIngestionQueueMessagesResult,
} from './ingestionQueuePublisher'
import type { RunDiscoveryIngestionInput } from './runDiscoveryIngestion'

type CreateIngestionRunArgs = Parameters<
  Parameters<typeof persistKickoffDiscoveryIngestion>[1]['createIngestionRun']
>[0]

type CreateIngestionRunResult = Awaited<
  ReturnType<Parameters<typeof persistKickoffDiscoveryIngestion>[1]['createIngestionRun']>
>

export type DryRunKickoffDiscoveryIngestionResult = PersistKickoffDiscoveryIngestionResult & {
  queueMessages: IngestionSectionJobQueueMessage[]
  publishedQueueMessages: IngestionSectionJobQueueMessage[]
  publishResult: PublishIngestionQueueMessagesResult
}

type DryRunKickoffDiscoveryIngestionOptions = {
  createRunId?: () => string
  now?: () => string
  createIngestionRun: (args: CreateIngestionRunArgs) => Promise<CreateIngestionRunResult>
  publisher?: IngestionQueuePublisher
  publishMode?: 'all' | 'first'
  previewOnly?: boolean
  promptVersion?: string
}

export async function dryRunKickoffDiscoveryIngestion(
  input: RunDiscoveryIngestionInput,
  options: DryRunKickoffDiscoveryIngestionOptions,
): Promise<DryRunKickoffDiscoveryIngestionResult> {
  const persisted = await persistKickoffDiscoveryIngestion(input, {
    createRunId: options.createRunId,
    now: options.now,
    createIngestionRun: options.createIngestionRun,
    previewOnly: options.previewOnly,
    promptVersion: options.promptVersion,
  })

  const queueMessages = buildIngestionSectionJobQueueMessages(persisted.persistedJobs)
  const publisher = options.publisher ?? noopIngestionQueuePublisher
  const publishedQueueMessages =
    options.publishMode === 'first' ? queueMessages.slice(0, 1) : queueMessages

  const publishResult = await publisher.publish(publishedQueueMessages)

  return {
    ...persisted,
    queueMessages,
    publishedQueueMessages,
    publishResult,
  }
}
