import { describe, expect, it } from 'vitest'
import { noopIngestionQueuePublisher } from '../ingestionQueuePublisher'

describe('ingestionQueuePublisher', () => {
  it('noop publisher reports attempted messages but publishes none', async () => {
    const result = await noopIngestionQueuePublisher.publish([
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'free',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'under30',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
    ])

    expect(result).toEqual({
      attempted: 2,
      published: 0,
      messages: [],
    })
  })
})
