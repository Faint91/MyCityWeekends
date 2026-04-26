import { describe, expect, it, vi } from 'vitest'

vi.mock('../discoverCandidateEvents', () => ({
  discoverCandidateEvents: vi.fn(),
}))

import { kickoffDiscoveryIngestion } from '../kickoffDiscoveryIngestion'

describe('kickoffDiscoveryIngestion', () => {
  it('prepares a run draft and jobs without touching DB or queues', () => {
    const logger = vi.fn()

    const result = kickoffDiscoveryIngestion(
      {
        trigger: 'cron',
        sections: ['free', 'under30', 'top3'],
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
      },
      {
        createRunId: () => 'run_123',
        now: () => '2026-05-01T09:00:00.000Z',
        logger,
      },
    )

    expect(result).toEqual({
      runId: 'run_123',
      plan: {
        trigger: 'cron',
        runId: 'run_123',
        sections: ['free', 'under30', 'top3'],
        jobs: [
          {
            runId: 'run_123',
            section: 'free',
            city: 'Vancouver, BC',
            weekendStart: '2026-05-01T00:00:00.000Z',
            weekendEnd: '2026-05-04T00:00:00.000Z',
            source: 'openai_web',
          },
          {
            runId: 'run_123',
            section: 'under30',
            city: 'Vancouver, BC',
            weekendStart: '2026-05-01T00:00:00.000Z',
            weekendEnd: '2026-05-04T00:00:00.000Z',
            source: 'openai_web',
          },
          {
            runId: 'run_123',
            section: 'top3',
            city: 'Vancouver, BC',
            weekendStart: '2026-05-01T00:00:00.000Z',
            weekendEnd: '2026-05-04T00:00:00.000Z',
            source: 'openai_web',
          },
        ],
      },
      run: {
        runId: 'run_123',
        trigger: 'cron',
        status: 'queued',
        city: 'Vancouver, BC',
        weekendStart: '2026-05-01T00:00:00.000Z',
        weekendEnd: '2026-05-04T00:00:00.000Z',
        source: 'openai_web',
        requestedSections: ['free', 'under30', 'top3'],
        sectionsState: {
          free: {
            status: 'queued',
            startedAt: null,
            finishedAt: null,
            error: null,
          },
          under30: {
            status: 'queued',
            startedAt: null,
            finishedAt: null,
            error: null,
          },
          top3: {
            status: 'queued',
            startedAt: null,
            finishedAt: null,
            error: null,
          },
        },
        jobCount: 3,
        createdAt: '2026-05-01T09:00:00.000Z',
      },
    })

    expect(logger).toHaveBeenCalledWith({
      type: 'ingestion.kickoff.prepared',
      runId: 'run_123',
      trigger: 'cron',
      city: 'Vancouver, BC',
      source: 'openai_web',
      sectionCount: 3,
      jobCount: 3,
    })
  })
})
