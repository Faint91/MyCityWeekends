import { describe, expect, it, vi } from 'vitest'

vi.mock('../discoverCandidateEvents', () => ({
  discoverCandidateEvents: vi.fn(),
}))

import { prepareIngestionKickoff } from '../prepareIngestionKickoff'

describe('prepareIngestionKickoff', () => {
  it('creates a runId and builds a kickoff plan', () => {
    const result = prepareIngestionKickoff(
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
    })
  })
})
