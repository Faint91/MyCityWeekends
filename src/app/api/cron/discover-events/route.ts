import { NextRequest, NextResponse } from 'next/server'

import { ensureDiscoveryWeekendDrop } from '@/lib/discovery/ensureDiscoveryWeekendDrop'
import { dryRunKickoffDiscoveryIngestion } from '@/lib/discovery/dryRunKickoffDiscoveryIngestion'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'
import { getPayloadClient } from '@/lib/payload'

export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return false
  }

  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${expectedSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    )
  }

  try {
    const payload = await getPayloadClient()

    await ensureDiscoveryWeekendDrop(payload, {
      city: 'Vancouver, BC',
    })

    const result = await dryRunKickoffDiscoveryIngestion(
      {
        source: 'openai_web',
        city: 'Vancouver, BC',
        trigger: 'cron',
      },
      {
        createIngestionRun: async (args) => {
          return payload.create({
            collection: 'ingestion-runs',
            overrideAccess: true,
            data: args,
          })
        },
        publisher: createVercelIngestionQueuePublisher(),
        publishMode: 'first',
        previewOnly: false,
        promptVersion: 'cron-kickoff-v1',
      },
    )

    return NextResponse.json(
      {
        ok: true,
        mode: 'cron_discover_events',
        result,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[cron-discover-events] Failed to queue ingestion', error)

    return NextResponse.json(
      {
        ok: false,
        mode: 'cron_discover_events',
        error: error instanceof Error ? error.message : 'Unknown cron discovery error.',
      },
      { status: 500 },
    )
  }
}
