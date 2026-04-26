import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { isIngestionSection } from '@/lib/discovery/ingestionSections'
import { runDiscoveryIngestion } from '@/lib/discovery/runDiscoveryIngestion'
import { getDiscoverySectionStrategy } from '@/lib/discovery/discoverySectionStrategy'
import { processIngestionSectionJob } from '@/lib/discovery/processIngestionSectionJob'

type RequestBody = {
  runId?: string
  ingestionRunId?: number | string
  section?: string
  city?: string
  weekendStart?: string
  weekendEnd?: string
  source?: 'mock' | 'openai_web'
  forceFailure?: boolean
}

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
  let body: RequestBody = {}

  try {
    body = (await req.json()) as RequestBody
  } catch {
    body = {}
  }

  if (!body.runId || !body.runId.trim()) {
    return NextResponse.json({ ok: false, error: 'runId is required' }, { status: 400 })
  }

  if (!body.section || !isIngestionSection(body.section)) {
    return NextResponse.json(
      { ok: false, error: 'section must be one of: free, under30, top3' },
      { status: 400 },
    )
  }

  const payload = {
    runId: body.runId.trim(),
    ingestionRunId: body.ingestionRunId,
    section: body.section,
    city: body.city ?? 'Vancouver, BC',
    weekendStart: body.weekendStart,
    weekendEnd: body.weekendEnd,
    source: body.source ?? 'mock',
  }

  const strategy = getDiscoverySectionStrategy(payload.section)

  const processed = await processIngestionSectionJob(payload, {
    runDiscovery:
      body.forceFailure === true
        ? async () => {
            throw new Error('Forced worker preview failure.')
          }
        : runDiscoveryIngestion,
    readIngestionRun,
    updateIngestionRun,
  })

  if (!processed.ok) {
    return NextResponse.json(
      {
        ok: false,
        mode: 'worker_preview_only',
        strategy,
        payload,
        error: processed.error,
        parentRunFailure: processed.parentRunFailure,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: 'worker_preview_only',
    strategy,
    payload,
    result: processed.execution,
    parentRunUpdate: processed.parentRunUpdate,
  })
}
