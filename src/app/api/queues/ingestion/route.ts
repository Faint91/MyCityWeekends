import { handleCallback } from '@vercel/queue'
import { getPayloadClient } from '@/lib/payload'
import { processIngestionQueueMessage } from '@/lib/discovery/processIngestionQueueMessage'
import { runDiscoveryIngestion } from '@/lib/discovery/runDiscoveryIngestion'
import { buildNextIngestionQueueMessage } from '@/lib/discovery/buildNextIngestionQueueMessage'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'

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

const queueCallback = handleCallback(async (message) => {
  const result = await processIngestionQueueMessage(message, {
    runDiscovery: runDiscoveryIngestion,
    readIngestionRun,
    updateIngestionRun,
  })

  if (!('payload' in result)) {
    throw new Error(result.error)
  }

  const progress = result.ok ? result.parentRunUpdate : result.parentRunFailure
  const nextMessage = buildNextIngestionQueueMessage(result.payload, progress)

  if (nextMessage) {
    const publisher = createVercelIngestionQueuePublisher()
    await publisher.publish([nextMessage])
  }

  if (!result.ok) {
    console.error('[ingestion queue] Section job failed but was recorded on parent run', {
      payload: result.payload,
      error: result.error,
      parentRunFailure: result.parentRunFailure,
    })
  }
})

export async function POST(request: Request) {
  return queueCallback({ request })
}
