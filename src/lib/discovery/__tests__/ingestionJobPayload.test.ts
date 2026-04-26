import { describe, expect, it } from 'vitest'
import { buildIngestionJobPayloads } from '../ingestionJobPayload'

describe('ingestionJobPayload', () => {
  it('builds one payload per unique section', () => {
    const payloads = buildIngestionJobPayloads({
      runId: 'run_123',
      sections: ['free', 'under30', 'free', 'top3'],
      city: 'Vancouver, BC',
      weekendStart: '2026-05-01T00:00:00.000Z',
      weekendEnd: '2026-05-04T00:00:00.000Z',
      source: 'openai_web',
    })

    expect(payloads).toEqual([
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
    ])
  })

  it('uses safe defaults for city and source', () => {
    const payloads = buildIngestionJobPayloads({
      runId: 'run_456',
      sections: ['free'],
    })

    expect(payloads).toEqual([
      {
        runId: 'run_456',
        section: 'free',
        city: 'Vancouver, BC',
        weekendStart: undefined,
        weekendEnd: undefined,
        source: 'openai_web',
      },
    ])
  })
})
