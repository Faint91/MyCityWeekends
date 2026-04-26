import { describe, expect, it, vi } from 'vitest'
import { recordIngestionSectionJobSuccess } from '../recordIngestionSectionJobSuccess'

describe('recordIngestionSectionJobSuccess', () => {
  it('updates the parent ingestion run after one section completes', async () => {
    const updateIngestionRun = vi.fn().mockResolvedValue(undefined)

    const result = await recordIngestionSectionJobSuccess(
      {
        runId: 'run_123',
        ingestionRunId: 87,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runId: 'run_123',
        section: 'free',
        trigger: 'worker',
        result: {
          runId: 81,
          source: 'mock',
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
      {
        now: () => '2026-04-26T04:00:00.000Z',
        readIngestionRun: vi.fn().mockResolvedValue({
          id: 87,
          rawQuerySummary: JSON.stringify({
            runId: 'run_123',
            trigger: 'api',
            requestedSections: ['free', 'under30', 'top3'],
            jobCount: 3,
            previewOnly: true,
          }),
        }),
        updateIngestionRun,
      },
    )

    expect(updateIngestionRun).toHaveBeenCalledTimes(1)

    const updateData = updateIngestionRun.mock.calls[0][1]

    expect(updateData.status).toBe('running')
    expect(updateData.candidateCount).toBe(1)
    expect(updateData.insertedCount).toBe(0)
    expect(updateData.duplicateCount).toBe(1)
    expect(updateData.freeCount).toBe(1)
    expect(updateData.under30Count).toBe(0)
    expect(updateData.pricedCount).toBe(0)
    expect(updateData.missingPriceCount).toBe(0)
    expect(updateData.refillFreeUsed).toBe(false)
    expect(updateData.refillUnder30Used).toBe(false)
    expect(updateData.finishedAt).toBeUndefined()

    expect(JSON.parse(updateData.rawQuerySummary)).toEqual({
      runId: 'run_123',
      trigger: 'api',
      requestedSections: ['free', 'under30', 'top3'],
      jobCount: 3,
      previewOnly: true,
      sectionResults: {
        free: {
          section: 'free',
          found: 1,
          inserted: 0,
          duplicates: 1,
          candidateIds: [],
          qualitySummary: {
            freeCount: 1,
            under30Count: 0,
            pricedCount: 0,
            missingPriceCount: 0,
            refillFreeUsed: false,
            refillUnder30Used: false,
          },
          completedAt: '2026-04-26T04:00:00.000Z',
        },
      },
    })

    expect(result?.status).toBe('running')
    expect(result?.completedSections).toEqual(['free'])
    expect(result?.requestedSections).toEqual(['free', 'under30', 'top3'])
  })

  it('marks the parent ingestion run succeeded when all requested sections are complete', async () => {
    const updateIngestionRun = vi.fn().mockResolvedValue(undefined)

    const previousSectionResults = {
      free: {
        section: 'free',
        found: 1,
        inserted: 1,
        duplicates: 0,
        candidateIds: [1],
        qualitySummary: {
          freeCount: 1,
          under30Count: 0,
          pricedCount: 0,
          missingPriceCount: 0,
          refillFreeUsed: false,
          refillUnder30Used: false,
        },
        completedAt: '2026-04-26T04:00:00.000Z',
      },
      under30: {
        section: 'under30',
        found: 1,
        inserted: 1,
        duplicates: 0,
        candidateIds: [2],
        qualitySummary: {
          freeCount: 0,
          under30Count: 1,
          pricedCount: 1,
          missingPriceCount: 0,
          refillFreeUsed: false,
          refillUnder30Used: false,
        },
        completedAt: '2026-04-26T04:01:00.000Z',
      },
    }

    const result = await recordIngestionSectionJobSuccess(
      {
        runId: 'run_123',
        ingestionRunId: 87,
        section: 'top3',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runId: 'run_123',
        section: 'top3',
        trigger: 'worker',
        result: {
          runId: 83,
          source: 'mock',
          city: 'Vancouver, BC',
          found: 1,
          inserted: 1,
          duplicates: 0,
          candidateIds: [3],
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
      {
        now: () => '2026-04-26T04:02:00.000Z',
        readIngestionRun: vi.fn().mockResolvedValue({
          id: 87,
          rawQuerySummary: JSON.stringify({
            runId: 'run_123',
            trigger: 'api',
            requestedSections: ['free', 'under30', 'top3'],
            jobCount: 3,
            previewOnly: true,
            sectionResults: previousSectionResults,
          }),
        }),
        updateIngestionRun,
      },
    )

    const updateData = updateIngestionRun.mock.calls[0][1]

    expect(updateData.status).toBe('succeeded')
    expect(updateData.finishedAt).toBe('2026-04-26T04:02:00.000Z')
    expect(updateData.candidateCount).toBe(3)
    expect(updateData.insertedCount).toBe(3)
    expect(updateData.duplicateCount).toBe(0)
    expect(updateData.freeCount).toBe(2)
    expect(updateData.under30Count).toBe(1)
    expect(updateData.pricedCount).toBe(1)
    expect(updateData.missingPriceCount).toBe(0)

    expect(result?.status).toBe('succeeded')
    expect(result?.completedSections).toEqual(['free', 'under30', 'top3'])
  })

  it('marks the parent run partial when the last pending section succeeds after another section failed', async () => {
    const updateIngestionRun = vi.fn().mockResolvedValue(undefined)

    const previousSectionResults = {
      under30: {
        section: 'under30',
        found: 1,
        inserted: 0,
        duplicates: 1,
        candidateIds: [],
        qualitySummary: {
          freeCount: 0,
          under30Count: 1,
          pricedCount: 1,
          missingPriceCount: 0,
          refillFreeUsed: false,
          refillUnder30Used: false,
        },
        completedAt: '2026-04-26T04:01:00.000Z',
      },
    }

    const previousSectionFailures = {
      free: {
        section: 'free',
        error: 'Forced worker preview failure.',
        failedAt: '2026-04-26T04:00:00.000Z',
      },
    }

    const result = await recordIngestionSectionJobSuccess(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'top3',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runId: 'run_123',
        section: 'top3',
        trigger: 'worker',
        result: {
          runId: 95,
          source: 'mock',
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
      {
        now: () => '2026-04-26T04:02:00.000Z',
        readIngestionRun: vi.fn().mockResolvedValue({
          id: 88,
          rawQuerySummary: JSON.stringify({
            runId: 'run_123',
            trigger: 'api',
            requestedSections: ['free', 'under30', 'top3'],
            jobCount: 3,
            previewOnly: true,
            sectionResults: previousSectionResults,
            sectionFailures: previousSectionFailures,
          }),
        }),
        updateIngestionRun,
      },
    )

    const updateData = updateIngestionRun.mock.calls[0][1]

    expect(updateData.status).toBe('partial')
    expect(updateData.finishedAt).toBe('2026-04-26T04:02:00.000Z')
    expect(updateData.candidateCount).toBe(2)
    expect(updateData.duplicateCount).toBe(2)
    expect(updateData.freeCount).toBe(1)
    expect(updateData.under30Count).toBe(1)
    expect(updateData.pricedCount).toBe(1)

    expect(result?.status).toBe('partial')
    expect(result?.completedSections).toEqual(['under30', 'top3'])
    expect(result?.failedSections).toEqual(['free'])
  })

  it('does nothing when no ingestionRunId is provided', async () => {
    const updateIngestionRun = vi.fn()

    const result = await recordIngestionSectionJobSuccess(
      {
        runId: 'run_123',
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        runId: 'run_123',
        section: 'free',
        trigger: 'worker',
        result: {
          runId: 81,
          source: 'mock',
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
      {
        readIngestionRun: vi.fn(),
        updateIngestionRun,
      },
    )

    expect(result).toBeNull()
    expect(updateIngestionRun).not.toHaveBeenCalled()
  })
})
