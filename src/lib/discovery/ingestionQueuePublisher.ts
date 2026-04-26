import type { IngestionSectionJobQueueMessage } from './ingestionQueueMessage'

export type PublishedIngestionQueueMessage = {
  messageId: string | null
  message: IngestionSectionJobQueueMessage
}

export type PublishIngestionQueueMessagesResult = {
  attempted: number
  published: number
  messages: PublishedIngestionQueueMessage[]
}

export type IngestionQueuePublisher = {
  publish: (
    messages: IngestionSectionJobQueueMessage[],
  ) => Promise<PublishIngestionQueueMessagesResult>
}

export const noopIngestionQueuePublisher: IngestionQueuePublisher = {
  async publish(messages) {
    return {
      attempted: messages.length,
      published: 0,
      messages: [],
    }
  },
}
