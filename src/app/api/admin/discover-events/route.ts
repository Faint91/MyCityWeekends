import { NextRequest, NextResponse } from 'next/server'
import { discoverCandidateEvents } from '@/lib/discovery/discoverCandidateEvents'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_DISCOVERY_SECRET
  if (!secret) return false

  const headerSecret = req.headers.get('x-admin-discovery-secret')
  if (headerSecret && headerSecret === secret) return true

  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    return token === secret
  }

  return false
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      city?: string
      weekendStart?: string
      weekendEnd?: string
      source?: 'mock' | 'openai_web'
    }

    console.log('[discover-events] Request received', {
      source: body.source ?? 'mock',
      city: body.city ?? 'Vancouver, BC',
    })

    const result = await discoverCandidateEvents({
      city: body.city,
      weekendStart: body.weekendStart,
      weekendEnd: body.weekendEnd,
      source: body.source ?? 'mock',
    })

    console.log('[discover-events] Request completed', result)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[discover-events] Request failed', error)

    const message = error instanceof Error ? error.message : 'Unknown discovery error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
