import { NextRequest, NextResponse } from 'next/server'

import { cleanupLatestExpiredWeekendDrop } from '@/lib/cleanupExpiredWeekendDrop'
import { getPayloadClient } from '@/lib/payload'

export const maxDuration = 60

const VANCOUVER_TIME_ZONE = 'America/Vancouver'

function isAuthorized(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return false
  }

  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${expectedSecret}`
}

function getVancouverLocalParts(date: Date): {
  weekday: string
  hour: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VANCOUVER_TIME_ZONE,
    weekday: 'long',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )

  return {
    weekday: map.weekday ?? '',
    hour: Number(map.hour ?? '0'),
  }
}

function shouldRunCleanup(req: NextRequest, now: Date): boolean {
  if (req.nextUrl.searchParams.get('force') === '1') {
    return true
  }

  const local = getVancouverLocalParts(now)
  return local.weekday === 'Monday' && local.hour === 3
}

function getRecentExpiredDropMinimumIso(now: Date): string {
  // Monday 3 AM cleanup should delete the weekend that ended around Monday 00:00 local.
  // This prevents duplicate cron delivery from deleting older historical drops.
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
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

  const now = new Date()
  const local = getVancouverLocalParts(now)

  if (!shouldRunCleanup(req, now)) {
    return NextResponse.json(
      {
        ok: true,
        mode: 'cleanup_weekend_drop',
        skipped: true,
        reason: 'Not Monday at 3 AM in Vancouver.',
        now: now.toISOString(),
        local,
      },
      { status: 200 },
    )
  }

  try {
    const payload = await getPayloadClient()

    const isForced = req.nextUrl.searchParams.get('force') === '1'

    const result = await cleanupLatestExpiredWeekendDrop(payload, {
      city: 'Vancouver, BC',
      now,
      minimumWeekendEndIso: isForced ? null : getRecentExpiredDropMinimumIso(now),
    })

    console.info('[cron-cleanup-weekend-drop] Cleanup finished', result)

    return NextResponse.json(
      {
        ok: true,
        mode: 'cleanup_weekend_drop',
        now: now.toISOString(),
        local,
        result,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[cron-cleanup-weekend-drop] Cleanup failed', error)

    return NextResponse.json(
      {
        ok: false,
        mode: 'cleanup_weekend_drop',
        now: now.toISOString(),
        local,
        error: error instanceof Error ? error.message : 'Unknown cleanup error.',
      },
      { status: 500 },
    )
  }
}
