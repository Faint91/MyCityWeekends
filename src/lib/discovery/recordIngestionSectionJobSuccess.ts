import type { ExecuteIngestionSectionJobResult } from './executeIngestionSectionJob'
import type { IngestionJobPayload } from './ingestionJobPayload'
import type { IngestionSection } from './ingestionSections'

type IngestionRunStatus = 'running' | 'succeeded' | 'failed' | 'partial'

type StoredSectionResult = {
  section: IngestionSection
  found: number
  inserted: number
  duplicates: number
  candidateIds: number[]
  qualitySummary: {
    freeCount: number
    under30Count: number
    pricedCount: number
    missingPriceCount: number
    refillFreeUsed: boolean
    refillUnder30Used: boolean
  }
  completedAt: string
}

type StoredSectionFailure = {
  section: IngestionSection
  error: string
  failedAt: string
}

type StoredRawQuerySummary = {
  runId?: string
  trigger?: string
  requestedSections?: IngestionSection[]
  jobCount?: number
  previewOnly?: boolean
  sectionResults?: Partial<Record<IngestionSection, StoredSectionResult>>
  sectionFailures?: Partial<Record<IngestionSection, StoredSectionFailure>>
}

type ExistingIngestionRun = {
  id: number | string
  rawQuerySummary?: string | null
}

type UpdateIngestionRunData = {
  status: IngestionRunStatus
  finishedAt?: string
  rawQuerySummary: string
  candidateCount: number
  insertedCount: number
  duplicateCount: number
  freeCount: number
  under30Count: number
  pricedCount: number
  missingPriceCount: number
  refillFreeUsed: boolean
  refillUnder30Used: boolean
}

type RecordIngestionSectionJobSuccessOptions = {
  now?: () => string
  readIngestionRun: (id: number | string) => Promise<ExistingIngestionRun | null>
  updateIngestionRun: (id: number | string, data: UpdateIngestionRunData) => Promise<unknown>
}

export type RecordIngestionSectionJobSuccessResult = {
  ingestionRunId: number | string
  status: IngestionRunStatus
  completedSections: IngestionSection[]
  failedSections: IngestionSection[]
  requestedSections: IngestionSection[]
  updateData: UpdateIngestionRunData
}

function parseRawQuerySummary(value: string | null | undefined): StoredRawQuerySummary {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function uniqueSections(sections: IngestionSection[]): IngestionSection[] {
  return [...new Set(sections)]
}

function hasAnyStoredSectionFailure(
  sectionFailures: Partial<Record<IngestionSection, StoredSectionFailure>>,
): boolean {
  return Object.values(sectionFailures).some(Boolean)
}

export async function recordIngestionSectionJobSuccess(
  payload: IngestionJobPayload,
  execution: ExecuteIngestionSectionJobResult,
  options: RecordIngestionSectionJobSuccessOptions,
): Promise<RecordIngestionSectionJobSuccessResult | null> {
  if (payload.ingestionRunId === undefined || payload.ingestionRunId === null) {
    return null
  }

  const existingRun = await options.readIngestionRun(payload.ingestionRunId)
  if (!existingRun) {
    throw new Error(`Ingestion run ${payload.ingestionRunId} was not found.`)
  }

  const completedAt = options.now?.() ?? new Date().toISOString()
  const previousSummary = parseRawQuerySummary(existingRun.rawQuerySummary)

  const requestedSections = uniqueSections(
    previousSummary.requestedSections?.length
      ? previousSummary.requestedSections
      : [payload.section],
  )

  const sectionResults: Partial<Record<IngestionSection, StoredSectionResult>> = {
    ...(previousSummary.sectionResults ?? {}),
    [payload.section]: {
      section: payload.section,
      found: execution.result.found,
      inserted: execution.result.inserted,
      duplicates: execution.result.duplicates,
      candidateIds: execution.result.candidateIds,
      qualitySummary: execution.result.qualitySummary,
      completedAt,
    },
  }

  const sectionFailures: Partial<Record<IngestionSection, StoredSectionFailure>> = {
    ...(previousSummary.sectionFailures ?? {}),
  }

  // If a failed section is retried successfully, clear the old failure.
  delete sectionFailures[payload.section]

  const completedSections = requestedSections.filter((section) => sectionResults[section])
  const failedSections = requestedSections.filter((section) => sectionFailures[section])

  const allRequestedSectionsFinished = requestedSections.every(
    (section) => sectionResults[section] || sectionFailures[section],
  )

  const totals = Object.values(sectionResults).reduce(
    (acc, sectionResult) => {
      if (!sectionResult) return acc

      acc.candidateCount += sectionResult.found
      acc.insertedCount += sectionResult.inserted
      acc.duplicateCount += sectionResult.duplicates
      acc.freeCount += sectionResult.qualitySummary.freeCount
      acc.under30Count += sectionResult.qualitySummary.under30Count
      acc.pricedCount += sectionResult.qualitySummary.pricedCount
      acc.missingPriceCount += sectionResult.qualitySummary.missingPriceCount
      acc.refillFreeUsed = acc.refillFreeUsed || sectionResult.qualitySummary.refillFreeUsed
      acc.refillUnder30Used =
        acc.refillUnder30Used || sectionResult.qualitySummary.refillUnder30Used

      return acc
    },
    {
      candidateCount: 0,
      insertedCount: 0,
      duplicateCount: 0,
      freeCount: 0,
      under30Count: 0,
      pricedCount: 0,
      missingPriceCount: 0,
      refillFreeUsed: false,
      refillUnder30Used: false,
    },
  )

  const status: IngestionRunStatus = allRequestedSectionsFinished
    ? failedSections.length > 0
      ? completedSections.length > 0
        ? 'partial'
        : 'failed'
      : 'succeeded'
    : 'running'

  const nextSummary: StoredRawQuerySummary = {
    ...previousSummary,
    requestedSections,
    sectionResults,
    ...(hasAnyStoredSectionFailure(sectionFailures) ? { sectionFailures } : {}),
  }

  const updateData: UpdateIngestionRunData = {
    status,
    ...(allRequestedSectionsFinished ? { finishedAt: completedAt } : {}),
    rawQuerySummary: JSON.stringify(nextSummary),
    ...totals,
  }

  await options.updateIngestionRun(payload.ingestionRunId, updateData)

  return {
    ingestionRunId: payload.ingestionRunId,
    status,
    completedSections,
    failedSections,
    requestedSections,
    updateData,
  }
}
