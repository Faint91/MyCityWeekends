import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  let message: unknown

  try {
    message = await req.json()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mode: 'queue_message_preview_only',
        error: 'Invalid JSON body.',
      },
      { status: 400 },
    )
  }

  const result = await processIngestionQueueMessage(message, {
    runDiscovery: runDiscoveryIngestion,
    readIngestionRun,
    updateIngestionRun,
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        mode: 'queue_message_preview_only',
        result,
      },
      { status: 400 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: 'queue_message_preview_only',
    result,
  })
}
