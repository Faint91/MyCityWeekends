export type IngestionDebugMeta = Record<string, unknown>

function errorToLogValue(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    raw: error,
  }
}

export function ingestionDebugLog(event: string, meta: IngestionDebugMeta = {}) {
  console.info(`[ingestion-debug] ${event}`, {
    at: new Date().toISOString(),
    ...meta,
  })
}

export function ingestionDebugError(event: string, error: unknown, meta: IngestionDebugMeta = {}) {
  console.error(`[ingestion-debug] ${event}`, {
    at: new Date().toISOString(),
    ...meta,
    error: errorToLogValue(error),
  })
}

export function durationMs(startedAt: number) {
  return Date.now() - startedAt
}
