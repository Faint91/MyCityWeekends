import { describe, expect, it } from 'vitest'
import {
  createInitialIngestionSectionsState,
  deriveIngestionOverallStatus,
  markSectionCompleted,
  markSectionFailed,
  markSectionRunning,
} from '../ingestionRunState'

describe('ingestionRunState', () => {
  it('creates queued state for requested sections', () => {
    const state = createInitialIngestionSectionsState(['free', 'under30'])

    expect(state.free?.status).toBe('queued')
    expect(state.under30?.status).toBe('queued')
    expect(state.top3).toBeUndefined()
    expect(deriveIngestionOverallStatus(state)).toBe('queued')
  })

  it('derives running, completed, and partial_failed states correctly', () => {
    let state = createInitialIngestionSectionsState(['free', 'under30'])

    state = markSectionRunning(state, 'free', '2026-04-25T10:00:00.000Z')
    expect(state.free?.status).toBe('running')
    expect(deriveIngestionOverallStatus(state)).toBe('running')

    state = markSectionCompleted(state, 'free', '2026-04-25T10:02:00.000Z')
    expect(state.free?.status).toBe('completed')

    state = markSectionFailed(state, 'under30', 'Timed out', '2026-04-25T10:03:00.000Z')

    expect(state.under30?.status).toBe('failed')
    expect(state.under30?.error).toBe('Timed out')
    expect(deriveIngestionOverallStatus(state)).toBe('partial_failed')
  })
})
