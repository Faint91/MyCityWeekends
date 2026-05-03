import {
  durationMs,
  ingestionDebugError,
  ingestionDebugLog,
} from '@/lib/discovery/ingestionDebugLog'
import { handleCallback } from '@vercel/queue'
import { getPayloadClient } from '@/lib/payload'
import { processIngestionQueueMessage } from '@/lib/discovery/processIngestionQueueMessage'
import { runDiscoveryIngestion } from '@/lib/discovery/runDiscoveryIngestion'
import { buildNextIngestionQueueMessage } from '@/lib/discovery/buildNextIngestionQueueMessage'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'
import { publishDiscoveryWeekendDrop } from '@/lib/discovery/ensureDiscoveryWeekendDrop'

export const maxDuration = 300

async function readIngestionRun(id: number | string) {
  const payloadClient = await getPayloadClient()

  return payloadClient.findByID({
    collection: 'ingestion-runs',
    id,
    overrideAccess: true,
  })
}

async function updateIngestionRun(id: number | string, data: Record<string, unknown>) {
  const payloadClient = await getPayloadClient()

  return payloadClient.update({
    collection: 'ingestion-runs',
    id,
    overrideAccess: true,
    data,
  })
}

function getQueueMessageDebugMeta(message: unknown) {
  if (!message || typeof message !== 'object') {
    return {
      messageShape: typeof message,
    }
  }

  const value = message as {
    type?: unknown
    version?: unknown
    job?: Record<string, unknown>
  }

  const job = value.job && typeof value.job === 'object' ? value.job : {}

  return {
    messageType: typeof value.type === 'string' ? value.type : undefined,
    version: value.version,
    runId: job.runId,
    ingestionRunId: job.ingestionRunId,
    section: job.section,
    source: job.source,
    city: job.city,
  }
}

const queueCallback = handleCallback(async (message) => {
  const startedAt = Date.now()
  const messageMeta = getQueueMessageDebugMeta(message)

  ingestionDebugLog('queue.callback.start', messageMeta)

  try {
    const result = await processIngestionQueueMessage(message, {
      runDiscovery: runDiscoveryIngestion,
      readIngestionRun,
      updateIngestionRun,
    })

    ingestionDebugLog('queue.callback.processed', {
      ...messageMeta,
      durationMs: durationMs(startedAt),
      ok: 'payload' in result ? result.ok : false,
      invalidMessage: !('payload' in result),
      error: 'payload' in result ? ('error' in result ? result.error : undefined) : result.error,
    })

    if (!('payload' in result)) {
      throw new Error(result.error)
    }

    const progress = result.ok ? result.parentRunUpdate : result.parentRunFailure

    ingestionDebugLog('queue.callback.progress', {
      ...messageMeta,
      status: progress?.status,
      completedSections: progress?.completedSections,
      failedSections: progress?.failedSections,
      requestedSections: progress?.requestedSections,
    })

    const nextMessage = buildNextIngestionQueueMessage(result.payload, progress)

    ingestionDebugLog('queue.callback.next-message', {
      ...messageMeta,
      hasNextMessage: Boolean(nextMessage),
      nextSection: nextMessage?.job.section,
    })

    if (nextMessage) {
      const publishStartedAt = Date.now()
      const publisher = createVercelIngestionQueuePublisher()

      ingestionDebugLog('queue.callback.publish-next.start', {
        ...messageMeta,
        nextSection: nextMessage.job.section,
      })

      const publishResult = await publisher.publish([nextMessage])

      ingestionDebugLog('queue.callback.publish-next.done', {
        ...messageMeta,
        nextSection: nextMessage.job.section,
        durationMs: durationMs(publishStartedAt),
        attempted: publishResult.attempted,
        published: publishResult.published,
        messageIds: publishResult.messages.map((published) => published.messageId),
      })
    }

    if (!nextMessage && (progress?.status === 'succeeded' || progress?.status === 'partial')) {
      const publishDropStartedAt = Date.now()

      ingestionDebugLog('queue.callback.publish-weekend-drop.start', {
        ...messageMeta,
        status: progress.status,
        weekendStart: result.payload.weekendStart,
        weekendEnd: result.payload.weekendEnd,
      })

      const payloadClient = await getPayloadClient()

      const publishedDrop = await publishDiscoveryWeekendDrop(payloadClient, {
        city: result.payload.city,
        weekendStart: result.payload.weekendStart,
        weekendEnd: result.payload.weekendEnd,
      })

      ingestionDebugLog('queue.callback.publish-weekend-drop.done', {
        ...messageMeta,
        status: progress.status,
        durationMs: durationMs(publishDropStartedAt),
        weekendDropId: publishedDrop.id,
        weekendDropTitle: publishedDrop.title,
      })
    }

    if (!result.ok) {
      ingestionDebugError('queue.callback.section-failed-recorded', result.error, {
        ...messageMeta,
        parentRunFailure: result.parentRunFailure,
      })
    }

    ingestionDebugLog('queue.callback.done', {
      ...messageMeta,
      durationMs: durationMs(startedAt),
    })
  } catch (error) {
    ingestionDebugError('queue.callback.unhandled-error', error, {
      ...messageMeta,
      durationMs: durationMs(startedAt),
    })

    throw error
  }
})

export async function POST(request: Request) {
  const startedAt = Date.now()

  ingestionDebugLog('queue.route.received')

  try {
    const response = await queueCallback({ request })

    ingestionDebugLog('queue.route.response', {
      durationMs: durationMs(startedAt),
      status: response.status,
    })

    return response
  } catch (error) {
    ingestionDebugError('queue.route.error', error, {
      durationMs: durationMs(startedAt),
    })

    throw error
  }
}
