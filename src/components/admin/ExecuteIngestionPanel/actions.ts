'use server'

import { discoverCandidateEvents } from '@/lib/discovery/discoverCandidateEvents'

export async function executeIngestionAction(input?: {
  source?: 'mock' | 'openai_web'
  city?: string
}) {
  try {
    const result = await discoverCandidateEvents({
      source: input?.source ?? 'openai_web',
      city: input?.city ?? 'Vancouver, BC',
    })

    return {
      ok: true as const,
      result,
    }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'Unknown ingestion error.',
    }
  }
}