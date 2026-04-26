import { NextRequest, NextResponse } from 'next/server'
import { kickoffDiscoveryIngestion } from '@/lib/discovery/kickoffDiscoveryIngestion'
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

  const result = kickoffDiscoveryIngestion({
    trigger: 'api',
    city: body.city ?? 'Vancouver, BC',
    weekendStart: body.weekendStart,
    weekendEnd: body.weekendEnd,
    source: body.source ?? 'openai_web',
    sections,
  })

  return NextResponse.json({
    ok: true,
    mode: 'preview_only',
    result,
  })
}
