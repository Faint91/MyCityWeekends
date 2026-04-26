import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/queue', () => ({
  send: vi.fn(),
}))

import { send } from '@vercel/queue'
import {
  createVercelIngestionQueuePublisher,
  INGESTION_QUEUE_TOPIC,
} from '../vercelIngestionQueuePublisher'

const sendMock = vi.mocked(send)

describe('vercelIngestionQueuePublisher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('publishes ingestion queue messages to the default topic', async () => {
    sendMock
      .mockResolvedValueOnce({ messageId: 'msg_free' })
      .mockResolvedValueOnce({ messageId: 'msg_under30' })

    const publisher = createVercelIngestionQueuePublisher()

    const messages = [
      {
        type: 'ingestion.section.job' as const,
        version: 1 as const,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'free' as const,
          city: 'Vancouver, BC',
          source: 'mock' as const,
        },
      },
      {
        type: 'ingestion.section.job' as const,
        version: 1 as const,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'under30' as const,
          city: 'Vancouver, BC',
          source: 'mock' as const,
        },
      },
    ]

    const result = await publisher.publish(messages)

    expect(sendMock).toHaveBeenCalledTimes(2)

    expect(sendMock).toHaveBeenNthCalledWith(1, INGESTION_QUEUE_TOPIC, messages[0], {
      idempotencyKey: 'run_123:free',
    })

    expect(sendMock).toHaveBeenNthCalledWith(2, INGESTION_QUEUE_TOPIC, messages[1], {
      idempotencyKey: 'run_123:under30',
    })

    expect(result).toEqual({
      attempted: 2,
      published: 2,
      messages: [
        {
          messageId: 'msg_free',
          message: messages[0],
        },
        {
          messageId: 'msg_under30',
          message: messages[1],
        },
      ],
    })
  })

  it('can publish to a custom topic', async () => {
    sendMock.mockResolvedValueOnce({ messageId: 'msg_custom' })

    const publisher = createVercelIngestionQueuePublisher({
      topic: 'custom-ingestion-topic',
    })

    const message = {
      type: 'ingestion.section.job' as const,
      version: 1 as const,
      job: {
        runId: 'run_456',
        ingestionRunId: 99,
        section: 'top3' as const,
        city: 'Vancouver, BC',
        source: 'mock' as const,
      },
    }

    const result = await publisher.publish([message])

    expect(sendMock).toHaveBeenCalledWith('custom-ingestion-topic', message, {
      idempotencyKey: 'run_456:top3',
    })

    expect(result).toEqual({
      attempted: 1,
      published: 1,
      messages: [
        {
          messageId: 'msg_custom',
          message,
        },
      ],
    })
  })
})
