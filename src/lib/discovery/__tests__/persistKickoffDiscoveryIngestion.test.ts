import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../discoverCandidateEvents', () => ({
  discoverCandidateEvents: vi.fn(),
}))

const createIngestionRunMock = vi.fn()

import { persistKickoffDiscoveryIngestion } from '../persistKickoffDiscoveryIngestion'

describe('persistKickoffDiscoveryIngestion', () => {
  beforeEach(() => {
    createIngestionRunMock.mockReset()
  })

  it('creates one ingestion-runs row and returns the prepared kickoff result', async () => {
    createIngestionRunMock.mockResolvedValue({
      id: 42,
      status: 'running',
    })

    const result = await persistKickoffDiscoveryIngestion(
      {
        trigger: 'api',
        sections: ['free', 'under30', 'top3'],
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
      },
      {
        createRunId: () => 'run_123',
        now: () => '2026-05-01T09:00:00.000Z',
        createIngestionRun: createIngestionRunMock,
      },
    )

    expect(createIngestionRunMock).toHaveBeenCalledTimes(1)
    expect(createIngestionRunMock).toHaveBeenCalledWith({
      status: 'running',
      city: 'Vancouver, BC',
      startedAt: '2026-05-01T09:00:00.000Z',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      promptVersion: 'kickoff-preview-v1',
      model: 'openai_web',
      rawQuerySummary: JSON.stringify({
        runId: 'run_123',
        trigger: 'api',
        requestedSections: ['free', 'under30', 'top3'],
        jobCount: 3,
        previewOnly: true,
      }),
      candidateCount: 0,
      insertedCount: 0,
      duplicateCount: 0,
    })

    expect(result.persistedRun).toEqual({
      id: 42,
      status: 'running',
    })

    expect(result.persistedJobs).toEqual([
      {
        runId: 'run_123',
        ingestionRunId: 42,
        section: 'free',
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
      },
      {
        runId: 'run_123',
        ingestionRunId: 42,
        section: 'under30',
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
      },
      {
        runId: 'run_123',
        ingestionRunId: 42,
        section: 'top3',
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
      },
    ])
  })
})
