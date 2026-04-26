import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { dryRunKickoffDiscoveryIngestion } from '@/lib/discovery/dryRunKickoffDiscoveryIngestion'
import { isIngestionSection } from '@/lib/discovery/ingestionSections'

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

export async function POST(req: NextRequest) {
  let body: RequestBody = {}

  try {
    body = (await req.json()) as RequestBody
  } catch {
    body = {}
  }

  const sections = normalizeRequestedSections(body)

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
        const payload = await getPayloadClient()

        return payload.create({
          collection: 'ingestion-runs',
          overrideAccess: true,
          data: args,
        })
      },
    },
  )

  return NextResponse.json({
    ok: true,
    mode: 'persist_preview_only',
    result,
    queueMessages: result.queueMessages,
    publishResult: result.publishResult,
  })
}
