import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../processIngestionSectionJob', () => ({
  processIngestionSectionJob: vi.fn(),
}))

import {
  parseIngestionSectionJobQueueMessage,
  processIngestionQueueMessage,
} from '../processIngestionQueueMessage'
import { processIngestionSectionJob } from '../processIngestionSectionJob'

const processSectionJobMock = vi.mocked(processIngestionSectionJob)

describe('processIngestionQueueMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parses a valid ingestion section job queue message', () => {
    const parsed = parseIngestionSectionJobQueueMessage({
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

    expect(parsed).toEqual({
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

  it('rejects an invalid queue message', async () => {
    const dependencies = {
      runDiscovery: vi.fn(),
      readIngestionRun: vi.fn(),
      updateIngestionRun: vi.fn(),
    }

    const result = await processIngestionQueueMessage(
      {
        type: 'wrong.message.type',
        version: 1,
        job: {
          runId: 'run_123',
          section: 'free',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: 'Invalid ingestion queue message.',
    })

    expect(processSectionJobMock).not.toHaveBeenCalled()
  })

  it('processes a valid queue message by delegating to processIngestionSectionJob', async () => {
    const dependencies = {
      runDiscovery: vi.fn(),
      readIngestionRun: vi.fn(),
      updateIngestionRun: vi.fn(),
    }

    const processedResult = {
      ok: true as const,
      payload: {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free' as const,
        city: 'Vancouver, BC',
        source: 'mock' as const,
      },
      execution: {
        runId: 'run_123',
        section: 'free' as const,
        trigger: 'worker' as const,
        result: {
          runId: 99,
          source: 'mock' as const,
          city: 'Vancouver, BC',
          found: 1,
          inserted: 0,
          duplicates: 1,
          candidateIds: [],
          weekendDropId: 104,
          weekendDropTitle: 'May 2nd',
          qualitySummary: {
            freeCount: 1,
            under30Count: 0,
            pricedCount: 0,
            missingPriceCount: 0,
            refillFreeUsed: false,
            refillUnder30Used: false,
          },
        },
      },
      parentRunUpdate: null,
    }

    processSectionJobMock.mockResolvedValue(processedResult)

    const message = {
      type: 'ingestion.section.job',
      version: 1,
      job: {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
    }

    const result = await processIngestionQueueMessage(message, dependencies)

    expect(processSectionJobMock).toHaveBeenCalledTimes(1)
    expect(processSectionJobMock).toHaveBeenCalledWith(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      dependencies,
    )

    expect(result).toEqual(processedResult)
  })
})
