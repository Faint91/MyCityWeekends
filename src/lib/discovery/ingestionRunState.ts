import type { IngestionSection } from './ingestionSections'

export const INGESTION_STAGE_STATUSES = ['queued', 'running', 'completed', 'failed'] as const

export type IngestionStageStatus = (typeof INGESTION_STAGE_STATUSES)[number]

export type IngestionOverallStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partial_failed'

export type IngestionSectionState = {
  status: IngestionStageStatus
  startedAt: string | null
  finishedAt: string | null
  error: string | null
}

export type IngestionSectionsState = Partial<Record<IngestionSection, IngestionSectionState>>

function buildSectionState(status: IngestionStageStatus): IngestionSectionState {
  return {
    status,
    startedAt: null,
    finishedAt: null,
    error: null,
  }
}

export function createInitialIngestionSectionsState(
  sections: IngestionSection[],
): IngestionSectionsState {
  return sections.reduce<IngestionSectionsState>((acc, section) => {
    acc[section] = buildSectionState('queued')
    return acc
  }, {})
}

export function markSectionRunning(
  state: IngestionSectionsState,
  section: IngestionSection,
  startedAt: string = new Date().toISOString(),
): IngestionSectionsState {
  return {
    ...state,
    [section]: {
      status: 'running',
      startedAt,
      finishedAt: null,
      error: null,
    },
  }
}

export function markSectionCompleted(
  state: IngestionSectionsState,
  section: IngestionSection,
  finishedAt: string = new Date().toISOString(),
): IngestionSectionsState {
  return {
    ...state,
    [section]: {
      ...(state[section] ?? buildSectionState('queued')),
      status: 'completed',
      finishedAt,
      error: null,
    },
  }
}

export function markSectionFailed(
  state: IngestionSectionsState,
  section: IngestionSection,
  error: string,
  finishedAt: string = new Date().toISOString(),
): IngestionSectionsState {
  return {
    ...state,
    [section]: {
      ...(state[section] ?? buildSectionState('queued')),
      status: 'failed',
      finishedAt,
      error,
    },
  }
}

export function deriveIngestionOverallStatus(
  state: IngestionSectionsState,
): IngestionOverallStatus {
  const sections = Object.values(state)

  if (!sections.length) return 'queued'

  const statuses = sections.map((section) => section.status)

  const allQueued = statuses.every((status) => status === 'queued')
  if (allQueued) return 'queued'

  const anyRunning = statuses.some((status) => status === 'running')
  if (anyRunning) return 'running'

  const allCompleted = statuses.every((status) => status === 'completed')
  if (allCompleted) return 'completed'

  const allFailed = statuses.every((status) => status === 'failed')
  if (allFailed) return 'failed'

  const anyFailed = statuses.some((status) => status === 'failed')
  if (anyFailed) return 'partial_failed'

  return 'queued'
}
