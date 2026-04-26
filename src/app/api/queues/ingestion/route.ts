import { handleCallback } from '@vercel/queue'
import { getPayloadClient } from '@/lib/payload'
import { processIngestionQueueMessage } from '@/lib/discovery/processIngestionQueueMessage'
import { runDiscoveryIngestion } from '@/lib/discovery/runDiscoveryIngestion'

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

  if (!result.ok) {
    throw new Error(result.error)
  }
})

export async function POST(request: Request) {
  return queueCallback({ request })
}
