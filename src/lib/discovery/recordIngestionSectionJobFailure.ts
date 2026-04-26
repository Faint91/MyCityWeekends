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
  errorSummary?: string
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

type RecordIngestionSectionJobFailureOptions = {
  now?: () => string
  readIngestionRun: (id: number | string) => Promise<ExistingIngestionRun | null>
  updateIngestionRun: (id: number | string, data: UpdateIngestionRunData) => Promise<unknown>
}

export type RecordIngestionSectionJobFailureResult = {
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

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown ingestion section worker error.'
}

function calculateTotals(sectionResults: Partial<Record<IngestionSection, StoredSectionResult>>) {
  return Object.values(sectionResults).reduce(
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
}

export async function recordIngestionSectionJobFailure(
  payload: IngestionJobPayload,
  error: unknown,
  options: RecordIngestionSectionJobFailureOptions,
): Promise<RecordIngestionSectionJobFailureResult | null> {
  if (payload.ingestionRunId === undefined || payload.ingestionRunId === null) {
    return null
  }

  const existingRun = await options.readIngestionRun(payload.ingestionRunId)
  if (!existingRun) {
    throw new Error(`Ingestion run ${payload.ingestionRunId} was not found.`)
  }

  const failedAt = options.now?.() ?? new Date().toISOString()
  const message = errorToMessage(error)
  const previousSummary = parseRawQuerySummary(existingRun.rawQuerySummary)

  const requestedSections = uniqueSections(
    previousSummary.requestedSections?.length
      ? previousSummary.requestedSections
      : [payload.section],
  )

  const sectionResults = previousSummary.sectionResults ?? {}

  const sectionFailures: Partial<Record<IngestionSection, StoredSectionFailure>> = {
    ...(previousSummary.sectionFailures ?? {}),
    [payload.section]: {
      section: payload.section,
      error: message,
      failedAt,
    },
  }

  const completedSections = requestedSections.filter((section) => sectionResults[section])
  const failedSections = requestedSections.filter((section) => sectionFailures[section])

  const allRequestedSectionsFinished = requestedSections.every(
    (section) => sectionResults[section] || sectionFailures[section],
  )

  const status: IngestionRunStatus = allRequestedSectionsFinished
    ? completedSections.length > 0
      ? 'partial'
      : 'failed'
    : 'running'

  const totals = calculateTotals(sectionResults)

  const nextSummary: StoredRawQuerySummary = {
    ...previousSummary,
    requestedSections,
    sectionResults,
    sectionFailures,
  }

  const updateData: UpdateIngestionRunData = {
    status,
    ...(allRequestedSectionsFinished ? { finishedAt: failedAt } : {}),
    errorSummary: message,
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
