import {
  durationMs,
  ingestionDebugError,
  ingestionDebugLog,
} from '@/lib/discovery/ingestionDebugLog'
import { ensureDiscoveryWeekendDrop } from '@/lib/discovery/ensureDiscoveryWeekendDrop'
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { dryRunKickoffDiscoveryIngestion } from '@/lib/discovery/dryRunKickoffDiscoveryIngestion'
import { isIngestionSection } from '@/lib/discovery/ingestionSections'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'

export const maxDuration = 60

type RequestBody = {
  city?: string
  weekendStart?: string
  weekendEnd?: string
  source?: 'mock' | 'openai_web'
  section?: string
  sections?: string[]
}

function normalizeRequestedSections(body: RequestBody) {
  if (Array.isArray(body.sections) && body.sections.length > 0) {
    return body.sections.filter(isIngestionSection)
  }

  if (body.section && isIngestionSection(body.section)) {
    return [body.section]
  }

  return undefined
}

function getRequestSecret(req: NextRequest): string | null {
  return (
    req.headers.get('x-admin-discovery-secret') ?? req.nextUrl.searchParams.get('secret') ?? null
  )
}

function isAuthorized(req: NextRequest): boolean {
  const expectedSecret = process.env.ADMIN_DISCOVERY_SECRET

  if (!expectedSecret) {
    return false
  }

  return getRequestSecret(req) === expectedSecret
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    )
  }

  let body: RequestBody = {}

  try {
    body = (await req.json()) as RequestBody
  } catch {
    body = {}
  }

  const sections = normalizeRequestedSections(body)

  const startedAt = Date.now()

  ingestionDebugLog('kickoff.route.start', {
    source: body.source ?? 'openai_web',
    city: body.city ?? 'Vancouver, BC',
    weekendStart: body.weekendStart,
    weekendEnd: body.weekendEnd,
    sections,
  })

  const payload = await getPayloadClient()

  await ensureDiscoveryWeekendDrop(payload, {
    city: body.city ?? 'Vancouver, BC',
    weekendStart: body.weekendStart,
    weekendEnd: body.weekendEnd,
  })

  ingestionDebugLog('kickoff.queue-publish.start', {
    source: body.source ?? 'openai_web',
    city: body.city ?? 'Vancouver, BC',
    sections,
  })

  const result = await dryRunKickoffDiscoveryIngestion(
    {
      trigger: 'api',
      city: body.city ?? 'Vancouver, BC',
      weekendStart: body.weekendStart,
      weekendEnd: body.weekendEnd,
      source: body.source ?? 'openai_web',
      sections,
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

  ingestionDebugLog('kickoff.queue-publish.done', {
    durationMs: durationMs(startedAt),
    persistedRunId: result.persistedRun.id,
    persistedRunStatus: result.persistedRun.status,
    requestedSections: result.run.requestedSections,
    attempted: result.publishResult.attempted,
    published: result.publishResult.published,
    publishedSections: result.publishedQueueMessages.map((message) => message.job.section),
  })

  return NextResponse.json({
    ok: true,
    mode: 'queue_kickoff',
    result,
  })
}
