import { describe, expect, it, vi } from 'vitest'

vi.mock('../discoverCandidateEvents', () => ({
  discoverCandidateEvents: vi.fn(),
}))

import { buildIngestionKickoffPlan } from '../buildIngestionKickoffPlan'

describe('buildIngestionKickoffPlan', () => {
  it('builds a kickoff plan with one job per section when runId exists', () => {
    const plan = buildIngestionKickoffPlan({
      trigger: 'cron',
      runId: 'run_123',
      sections: ['free', 'under30', 'top3'],
      city: 'Vancouver, BC',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      source: 'openai_web',
    })

    expect(plan).toEqual({
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
    })
  })

  it('builds a plan with no jobs when runId is missing', () => {
    const plan = buildIngestionKickoffPlan({
      trigger: 'admin',
      sections: ['free'],
      city: 'Vancouver, BC',
    })

    expect(plan).toEqual({
      trigger: 'admin',
      runId: null,
      sections: ['free'],
      jobs: [],
    })
  })
})
