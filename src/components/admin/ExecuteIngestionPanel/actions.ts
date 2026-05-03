'use server'

import { ensureDiscoveryWeekendDrop } from '@/lib/discovery/ensureDiscoveryWeekendDrop'
import { getPayloadClient } from '@/lib/payload'
import { dryRunKickoffDiscoveryIngestion } from '@/lib/discovery/dryRunKickoffDiscoveryIngestion'
import { noopIngestionQueuePublisher } from '@/lib/discovery/ingestionQueuePublisher'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'
import { cleanupLatestExpiredWeekendDrop } from '@/lib/cleanupExpiredWeekendDrop'

function getAdminIngestionQueuePublisher() {
  if (process.env.VERCEL === '1') {
    return createVercelIngestionQueuePublisher()
  }

  return noopIngestionQueuePublisher
}

export type ExecuteIngestionQueuedResult = Awaited<
  ReturnType<typeof dryRunKickoffDiscoveryIngestion>
>

export async function executeIngestionAction(input?: {
  source?: 'mock' | 'openai_web'
  city?: string
}) {
  try {
    const payload = await getPayloadClient()

    await ensureDiscoveryWeekendDrop(payload, {
      city: input?.city ?? 'Vancouver, BC',
    })
    const result = await dryRunKickoffDiscoveryIngestion(
      {
        source: input?.source ?? 'openai_web',
        city: input?.city ?? 'Vancouver, BC',
        trigger: 'admin',
      },
      {
        createIngestionRun: async (args) => {
          return payload.create({
            collection: 'ingestion-runs',
            overrideAccess: true,
            data: args,
          })
        },
        publisher: getAdminIngestionQueuePublisher(),
        publishMode: 'first',
        previewOnly: false,
        promptVersion: 'queue-kickoff-v1',
      },
    )

    return {
      ok: true as const,
      result,
    }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unknown ingestion queue kickoff error.',
    }
  }
}

export type CleanupExpiredWeekendDropActionResult = Awaited<
  ReturnType<typeof cleanupLatestExpiredWeekendDrop>
>

export async function cleanupExpiredWeekendDropAction() {
  try {
    const payload = await getPayloadClient()

    const result = await cleanupLatestExpiredWeekendDrop(payload, {
      city: 'Vancouver, BC',
    })

    return {
      ok: true as const,
      result,
    }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unknown Weekend Drop cleanup error.',
    }
  }
}
