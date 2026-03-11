'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSavedSlugs } from '@/lib/savedEvents'
import { EventPickCard } from '@/components/EventPickCard'
import { trackEvent } from '@/lib/ga'

type EventDoc = {
  id: string
  title?: string
  slug?: string
  startAt?: string
  isFree?: boolean
  priceMin?: number | null
  priceMax?: number | null
  currency?: string
  ticketUrl?: string
  sourceUrl?: string
  neighborhood?: string
  venue?: { name?: string } | string | null
}

function formatPrice(e: EventDoc): string {
  if (e.isFree) return 'Free'
  const min = e.priceMin ?? null
  const max = e.priceMax ?? null
  const cur = (e.currency as any) ?? 'CAD'
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n)

  if (typeof min === 'number' && typeof max === 'number')
    return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`
  if (typeof min === 'number') return `From ${fmt(min)}`
  if (typeof max === 'number') return `Up to ${fmt(max)}`
  return 'Cheap'
}

function formatWhen(startAt?: string): string | null {
  if (!startAt) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startAt))
}

export default function SavedPageClient() {
  const [slugs, setSlugs] = useState<string[]>([])
  const [events, setEvents] = useState<EventDoc[] | null>(null)

  useEffect(() => {
    const next = getSavedSlugs()
    setSlugs(next)
    trackEvent('open_saved', { count: next.length })

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mycityweekends:saved_slugs') setSlugs(getSavedSlugs())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const slugsParam = useMemo(() => slugs.join(','), [slugs])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (slugs.length === 0) {
        setEvents([])
        return
      }
      setEvents(null)
      const res = await fetch(`/api/events/by-slugs?slugs=${encodeURIComponent(slugsParam)}`)
      const json = await res.json()
      if (cancelled) return
      setEvents(Array.isArray(json?.docs) ? json.docs : [])
    }

    run()
    return () => {
      cancelled = true
    }
  }, [slugs.length, slugsParam])

  if (slugs.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-black/70 dark:text-white/70">No saved events yet.</p>
        <Link className="underline" href="/">
          Browse this weekend
        </Link>
      </div>
    )
  }

  if (events === null) {
    return <p className="text-black/70 dark:text-white/70">Loading saved events…</p>
  }

  // Keep saved order
  const bySlug = new Map(events.map((e) => [e.slug, e]))
  const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean) as EventDoc[]

  return (
    <div className="space-y-3">
      {ordered.map((event) => {
        const venueName = typeof event.venue === 'object' && event.venue ? event.venue.name : null
        const detailsUrl = (event.ticketUrl ?? event.sourceUrl) as string | undefined

        return (
          <EventPickCard
            key={event.id}
            internalHref={event.slug ? `/event/${event.slug}` : null}
            // no rank on saved page
            title={event.title ?? 'Untitled event'}
            when={formatWhen(event.startAt)}
            where={venueName ?? event.neighborhood ?? null}
            price={formatPrice(event)}
            detailsUrl={detailsUrl ?? null}
            // allow saving/un-saving from this page too
            saveSlug={event.slug ?? null}
          />
        )
      })}
    </div>
  )
}
