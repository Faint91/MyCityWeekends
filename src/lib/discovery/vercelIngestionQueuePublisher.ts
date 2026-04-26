import { send } from '@vercel/queue'
import type {
  IngestionQueuePublisher,
  PublishIngestionQueueMessagesResult,
} from './ingestionQueuePublisher'
import type { IngestionSectionJobQueueMessage } from './ingestionQueueMessage'

export const INGESTION_QUEUE_TOPIC = 'mycityweekends-ingestion' as const

export type VercelIngestionQueuePublisherOptions = {
  topic?: string
}

export function createVercelIngestionQueuePublisher(
  options: VercelIngestionQueuePublisherOptions = {},
): IngestionQueuePublisher {
  const topic = options.topic ?? INGESTION_QUEUE_TOPIC

  return {
    async publish(
      messages: IngestionSectionJobQueueMessage[],
    ): Promise<PublishIngestionQueueMessagesResult> {
      const publishedMessages = []

      for (const message of messages) {
        const { messageId } = await send(topic, message, {
          idempotencyKey: `${message.job.runId}:${message.job.section}`,
        })

        publishedMessages.push({
          messageId,
          message,
        })
      }

      return {
        attempted: messages.length,
        published: publishedMessages.length,
        messages: publishedMessages,
      }
    },
  }
}
