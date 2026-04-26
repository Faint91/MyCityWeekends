import { describe, expect, it, vi } from 'vitest'

vi.mock('../discoverCandidateEvents', () => ({
  discoverCandidateEvents: vi.fn(),
}))

import { buildRunDiscoveryIngestionContext } from '../runDiscoveryIngestion'

describe('runDiscoveryIngestion context', () => {
  it('builds default context', () => {
    const context = buildRunDiscoveryIngestionContext()

    expect(context.trigger).toBe('admin')
    expect(context.runId).toBeNull()
    expect(context.sections).toEqual(['free', 'under30', 'top3'])
  })

  it('builds context for a single worker section', () => {
    const context = buildRunDiscoveryIngestionContext({
      trigger: 'worker',
      runId: 'run_123',
      section: 'under30',
    })

    expect(context.trigger).toBe('worker')
    expect(context.runId).toBe('run_123')
    expect(context.sections).toEqual(['under30'])
  })

  it('dedupes explicit sections', () => {
    const context = buildRunDiscoveryIngestionContext({
      trigger: 'cron',
      runId: 'run_456',
      sections: ['free', 'under30', 'free'],
    })

    expect(context.trigger).toBe('cron')
    expect(context.runId).toBe('run_456')
    expect(context.sections).toEqual(['free', 'under30'])
  })
})
