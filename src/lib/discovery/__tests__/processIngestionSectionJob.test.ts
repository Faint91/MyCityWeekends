import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../executeIngestionSectionJob', () => ({
  executeIngestionSectionJob: vi.fn(),
}))

vi.mock('../recordIngestionSectionJobSuccess', () => ({
  recordIngestionSectionJobSuccess: vi.fn(),
}))

vi.mock('../recordIngestionSectionJobFailure', () => ({
  recordIngestionSectionJobFailure: vi.fn(),
}))

import { executeIngestionSectionJob } from '../executeIngestionSectionJob'
import { recordIngestionSectionJobSuccess } from '../recordIngestionSectionJobSuccess'
import { recordIngestionSectionJobFailure } from '../recordIngestionSectionJobFailure'
import { processIngestionSectionJob } from '../processIngestionSectionJob'

const executeMock = vi.mocked(executeIngestionSectionJob)
const successMock = vi.mocked(recordIngestionSectionJobSuccess)
const failureMock = vi.mocked(recordIngestionSectionJobFailure)

describe('processIngestionSectionJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records success when the section job succeeds', async () => {
    const payload = {
      runId: 'run_123',
      ingestionRunId: 88,
      section: 'free' as const,
      city: 'Vancouver, BC',
      source: 'mock' as const,
    }

    const execution = {
      runId: 'run_123',
      section: 'free' as const,
      trigger: 'worker' as const,
      result: {
        runId: 100,
        source: 'mock' as const,
        city: 'Vancouver, BC',
        found: 1,
        inserted: 1,
        duplicates: 0,
        candidateIds: [1],
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
    }

    executeMock.mockResolvedValue(execution)
    successMock.mockResolvedValue({
      ingestionRunId: 88,
      status: 'running',
      completedSections: ['free'],
      failedSections: [],
      requestedSections: ['free', 'under30', 'top3'],
      updateData: {} as never,
    })

    const dependencies = {
      runDiscovery: vi.fn(),
      readIngestionRun: vi.fn(),
      updateIngestionRun: vi.fn(),
    }

    const result = await processIngestionSectionJob(payload, dependencies)

    expect(executeMock).toHaveBeenCalledWith(payload, {
      runDiscovery: dependencies.runDiscovery,
    })
    expect(successMock).toHaveBeenCalledWith(payload, execution, {
      readIngestionRun: dependencies.readIngestionRun,
      updateIngestionRun: dependencies.updateIngestionRun,
    })
    expect(failureMock).not.toHaveBeenCalled()

    expect(result.ok).toBe(true)
    expect(result).toEqual({
      ok: true,
      payload,
      execution,
      parentRunUpdate: {
        ingestionRunId: 88,
        status: 'running',
        completedSections: ['free'],
        failedSections: [],
        requestedSections: ['free', 'under30', 'top3'],
        updateData: {},
      },
    })
  })

  it('records failure when the section job fails', async () => {
    const payload = {
      runId: 'run_123',
      ingestionRunId: 88,
      section: 'free' as const,
      city: 'Vancouver, BC',
      source: 'mock' as const,
    }

    const error = new Error('Worker failed')

    executeMock.mockRejectedValue(error)
    failureMock.mockResolvedValue({
      ingestionRunId: 88,
      status: 'running',
      completedSections: [],
      failedSections: ['free'],
      requestedSections: ['free', 'under30', 'top3'],
      updateData: {} as never,
    })

    const dependencies = {
      runDiscovery: vi.fn(),
      readIngestionRun: vi.fn(),
      updateIngestionRun: vi.fn(),
    }

    const result = await processIngestionSectionJob(payload, dependencies)

    expect(executeMock).toHaveBeenCalledWith(payload, {
      runDiscovery: dependencies.runDiscovery,
    })
    expect(successMock).not.toHaveBeenCalled()
    expect(failureMock).toHaveBeenCalledWith(payload, error, {
      readIngestionRun: dependencies.readIngestionRun,
      updateIngestionRun: dependencies.updateIngestionRun,
    })

    expect(result).toEqual({
      ok: false,
      payload,
      error: 'Worker failed',
      parentRunFailure: {
        ingestionRunId: 88,
        status: 'running',
        completedSections: [],
        failedSections: ['free'],
        requestedSections: ['free', 'under30', 'top3'],
        updateData: {},
      },
    })
  })
})
