import { describe, expect, it, vi } from 'vitest'
import { recordIngestionSectionJobFailure } from '../recordIngestionSectionJobFailure'

describe('recordIngestionSectionJobFailure', () => {
  it('keeps the parent run running when one section fails but others remain pending', async () => {
    const updateIngestionRun = vi.fn().mockResolvedValue(undefined)

    const result = await recordIngestionSectionJobFailure(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      new Error('Worker timed out'),
      {
        now: () => '2026-04-26T04:10:00.000Z',
        readIngestionRun: vi.fn().mockResolvedValue({
          id: 88,
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
    expect(updateData.finishedAt).toBeUndefined()
    expect(updateData.errorSummary).toBe('Worker timed out')
    expect(updateData.candidateCount).toBe(0)
    expect(updateData.insertedCount).toBe(0)
    expect(updateData.duplicateCount).toBe(0)

    expect(JSON.parse(updateData.rawQuerySummary)).toEqual({
      runId: 'run_123',
      trigger: 'api',
      requestedSections: ['free', 'under30', 'top3'],
      jobCount: 3,
      previewOnly: true,
      sectionResults: {},
      sectionFailures: {
        free: {
          section: 'free',
          error: 'Worker timed out',
          failedAt: '2026-04-26T04:10:00.000Z',
        },
      },
    })

    expect(result?.status).toBe('running')
    expect(result?.completedSections).toEqual([])
    expect(result?.failedSections).toEqual(['free'])
    expect(result?.requestedSections).toEqual(['free', 'under30', 'top3'])
  })

  it('marks the parent run partial when one section fails after other sections completed', async () => {
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

    const result = await recordIngestionSectionJobFailure(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'top3',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      'Top 3 provider failed',
      {
        now: () => '2026-04-26T04:12:00.000Z',
        readIngestionRun: vi.fn().mockResolvedValue({
          id: 88,
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

    expect(updateData.status).toBe('partial')
    expect(updateData.finishedAt).toBe('2026-04-26T04:12:00.000Z')
    expect(updateData.errorSummary).toBe('Top 3 provider failed')
    expect(updateData.candidateCount).toBe(2)
    expect(updateData.insertedCount).toBe(2)
    expect(updateData.duplicateCount).toBe(0)
    expect(updateData.freeCount).toBe(1)
    expect(updateData.under30Count).toBe(1)
    expect(updateData.pricedCount).toBe(1)

    expect(result?.status).toBe('partial')
    expect(result?.completedSections).toEqual(['free', 'under30'])
    expect(result?.failedSections).toEqual(['top3'])
  })

  it('marks the parent run failed when all requested sections failed', async () => {
    const updateIngestionRun = vi.fn().mockResolvedValue(undefined)

    const result = await recordIngestionSectionJobFailure(
      {
        runId: 'run_123',
        ingestionRunId: 88,
        section: 'top3',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      'Final section failed',
      {
        now: () => '2026-04-26T04:15:00.000Z',
        readIngestionRun: vi.fn().mockResolvedValue({
          id: 88,
          rawQuerySummary: JSON.stringify({
            runId: 'run_123',
            trigger: 'api',
            requestedSections: ['free', 'under30', 'top3'],
            jobCount: 3,
            previewOnly: true,
            sectionFailures: {
              free: {
                section: 'free',
                error: 'Free failed',
                failedAt: '2026-04-26T04:00:00.000Z',
              },
              under30: {
                section: 'under30',
                error: 'Under30 failed',
                failedAt: '2026-04-26T04:01:00.000Z',
              },
            },
          }),
        }),
        updateIngestionRun,
      },
    )

    const updateData = updateIngestionRun.mock.calls[0][1]

    expect(updateData.status).toBe('failed')
    expect(updateData.finishedAt).toBe('2026-04-26T04:15:00.000Z')
    expect(updateData.errorSummary).toBe('Final section failed')

    expect(result?.status).toBe('failed')
    expect(result?.completedSections).toEqual([])
    expect(result?.failedSections).toEqual(['free', 'under30', 'top3'])
  })

  it('does nothing when no ingestionRunId is provided', async () => {
    const updateIngestionRun = vi.fn()

    const result = await recordIngestionSectionJobFailure(
      {
        runId: 'run_123',
        section: 'free',
        city: 'Vancouver, BC',
        source: 'mock',
      },
      'No parent run',
      {
        readIngestionRun: vi.fn(),
        updateIngestionRun,
      },
    )

    expect(result).toBeNull()
    expect(updateIngestionRun).not.toHaveBeenCalled()
  })
})
