import { describe, expect, it } from 'vitest'
import {
  buildIngestionSectionJobQueueMessage,
  buildIngestionSectionJobQueueMessages,
} from '../ingestionQueueMessage'

describe('ingestionQueueMessage', () => {
  it('builds one queue message for one persisted job', () => {
    const message = buildIngestionSectionJobQueueMessage({
      runId: 'run_123',
      ingestionRunId: 88,
      section: 'free',
      city: 'Vancouver, BC',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      source: 'mock',
    })

    expect(message).toEqual({
      type: 'ingestion.section.job',
      version: 1,
      job: {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'mock',
      },
    })
  })

  it('builds one queue message per persisted job', () => {
    const messages = buildIngestionSectionJobQueueMessages([
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'under30',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'top3',
        city: 'Vancouver, BC',
        source: 'mock',
      },
    ])

    expect(messages).toEqual([
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
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'top3',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
    ])
  })
})
