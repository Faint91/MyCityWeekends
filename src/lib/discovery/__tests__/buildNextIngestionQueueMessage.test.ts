import { describe, expect, it } from 'vitest'
import { buildNextIngestionQueueMessage } from '../buildNextIngestionQueueMessage'

describe('buildNextIngestionQueueMessage', () => {
  it('builds the next pending section message after a success', () => {
    const result = buildNextIngestionQueueMessage(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        requestedSections: ['free', 'under30', 'top3'],
        completedSections: ['free'],
        failedSections: [],
      },
    )

    expect(result).toEqual({
      type: 'ingestion.section.job',
      version: 1,
      job: {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'under30',
        city: 'Vancouver, BC',
        source: 'mock',
      },
    })
  })

  it('skips failed sections and builds the next pending section message', () => {
    const result = buildNextIngestionQueueMessage(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        requestedSections: ['free', 'under30', 'top3'],
        completedSections: [],
        failedSections: ['free'],
      },
    )

    expect(result?.job.section).toBe('under30')
  })

  it('returns null when all sections are finished', () => {
    const result = buildNextIngestionQueueMessage(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'top3',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        requestedSections: ['free', 'under30', 'top3'],
        completedSections: ['under30', 'top3'],
        failedSections: ['free'],
      },
    )

    expect(result).toBeNull()
  })
})
