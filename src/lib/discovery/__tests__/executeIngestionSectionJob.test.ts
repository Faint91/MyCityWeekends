import { describe, expect, it, vi } from 'vitest'
import { executeIngestionSectionJob } from '../executeIngestionSectionJob'

describe('executeIngestionSectionJob', () => {
  it('runs one section job with worker context', async () => {
    const runDiscoveryMock = vi.fn().mockResolvedValue({
      candidateCount: 7,
      insertedCount: 5,
      duplicateCount: 2,
      freeCount: 3,
      under30Count: 4,
      pricedCount: 4,
      missingPriceCount: 3,
      refillFreeUsed: false,
      refillUnder30Used: true,
      runId: 99,
    })

    const result = await executeIngestionSectionJob(
      {
        runId: 'run_123',
        section: 'free',
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
      },
      {
        runDiscovery: runDiscoveryMock,
      },
    )

    expect(runDiscoveryMock).toHaveBeenCalledTimes(1)
    expect(runDiscoveryMock).toHaveBeenCalledWith({
      trigger: 'worker',
      runId: 'run_123',
      section: 'free',
      city: 'Vancouver, BC',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      source: 'openai_web',
    })

    expect(result).toEqual({
      runId: 'run_123',
      section: 'free',
      trigger: 'worker',
      result: {
        candidateCount: 7,
        insertedCount: 5,
        duplicateCount: 2,
        freeCount: 3,
        under30Count: 4,
        pricedCount: 4,
        missingPriceCount: 3,
        refillFreeUsed: false,
        refillUnder30Used: true,
        runId: 99,
      },
    })
  })

  it('passes numeric ingestionRunId through to discovery when provided', async () => {
    const runDiscoveryMock = vi.fn().mockResolvedValue({
      candidateCount: 1,
      insertedCount: 1,
      duplicateCount: 0,
      freeCount: 1,
      under30Count: 0,
      pricedCount: 0,
      missingPriceCount: 0,
      refillFreeUsed: false,
      refillUnder30Used: false,
      runId: 88,
    })

    await executeIngestionSectionJob(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runDiscovery: runDiscoveryMock,
      },
    )

    expect(runDiscoveryMock).toHaveBeenCalledWith({
      trigger: 'worker',
      runId: 'run_123',
      section: 'free',
      city: 'Vancouver, BC',
      weekendStart: undefined,
      weekendEnd: undefined,
      source: 'mock',
      ingestionRunId: 88,
    })
  })
})
