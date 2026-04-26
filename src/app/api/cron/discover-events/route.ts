import { NextRequest, NextResponse } from 'next/server'

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

  const origin = req.nextUrl.origin
  const adminSecret = process.env.ADMIN_DISCOVERY_SECRET

  if (!adminSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing ADMIN_DISCOVERY_SECRET',
      },
      { status: 500 },
    )
  }

  const response = await fetch(`${origin}/api/admin/discover-events/kickoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-discovery-secret': adminSecret,
    },
    body: JSON.stringify({
      city: 'Vancouver, BC',
      source: 'openai_web',
    }),
  })

  const data = await response.json().catch(() => null)

  return NextResponse.json(
    {
      ok: response.ok,
      mode: 'cron_discover_events',
      kickoffStatus: response.status,
      kickoff: data,
    },
    { status: response.ok ? 200 : 500 },
  )
}
