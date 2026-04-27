'use server'

import { ensureDiscoveryWeekendDrop } from '@/lib/discovery/ensureDiscoveryWeekendDrop'
import { getPayloadClient } from '@/lib/payload'
import { dryRunKickoffDiscoveryIngestion } from '@/lib/discovery/dryRunKickoffDiscoveryIngestion'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'

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
        publisher: createVercelIngestionQueuePublisher(),
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
