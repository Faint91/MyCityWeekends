import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { dryRunKickoffDiscoveryIngestion } from '@/lib/discovery/dryRunKickoffDiscoveryIngestion'
import { isIngestionSection } from '@/lib/discovery/ingestionSections'
import { createVercelIngestionQueuePublisher } from '@/lib/discovery/vercelIngestionQueuePublisher'

type RequestBody = {
  city?: string
  weekendStart?: string
  weekendEnd?: string
  source?: 'mock' | 'openai_web'
  section?: string
  sections?: string[]
  publishToQueue?: boolean
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

export async function POST(req: NextRequest) {
  let body: RequestBody = {}

  try {
    body = (await req.json()) as RequestBody
  } catch {
    body = {}
  }

  const sections = normalizeRequestedSections(body)
  const publishToQueue = body.publishToQueue === true

  const result = await dryRunKickoffDiscoveryIngestion(
    {
      trigger: 'api',
      city: body.city ?? 'Vancouver, BC',
      weekendStart: body.weekendStart,
      weekendEnd: body.weekendEnd,
      source: body.source ?? 'mock',
      sections,
    },
    {
      createIngestionRun: async (args) => {
        const payload = await getPayloadClient()

        return payload.create({
          collection: 'ingestion-runs',
          overrideAccess: true,
          data: args,
        })
      },
      publisher: publishToQueue ? createVercelIngestionQueuePublisher() : undefined,
      publishMode: publishToQueue ? 'first' : 'all',
    },
  )

  return NextResponse.json({
    ok: true,
    mode: 'queue_kickoff_preview',
    queuePublishing: publishToQueue ? 'vercel_queue' : 'noop',
    result,
  })
}
