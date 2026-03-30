'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getSavedSlugs, subscribeToSavedSlugs } from '@/lib/savedEvents'
import { EventPickCard } from '@/components/EventPickCard'
import { trackEvent } from '@/lib/ga'
import type { Media } from '@/payload-types'

type EventDoc = {
  id: string | number
  title?: string | null
  slug?: string | null
  startAt?: string | null
  isFree?: boolean | null
  priceMin?: number | null
  priceMax?: number | null
  currency?: 'CAD' | null
  ticketUrl?: string | null
  sourceUrl?: string | null
  neighborhood?: string | null
  venue?: { name?: string | null } | string | number | null
  image?: number | Media | null
}

type BySlugsResponse = {
  docs?: EventDoc[]
}

function formatPrice(e: EventDoc): string {
  if (e.isFree) return 'Free'
  const min = e.priceMin ?? null
  const max = e.priceMax ?? null
  const cur = e.currency ?? 'CAD'
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n)

  if (typeof min === 'number' && typeof max === 'number') {
    return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`
  }
  if (typeof min === 'number') return `From ${fmt(min)}`
  if (typeof max === 'number') return `Up to ${fmt(max)}`
  return 'Cheap'
}

function formatWhen(startAt?: string | null): string | null {
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

async function fetchEventsBySlugs(slugs: string[]): Promise<EventDoc[]> {
  if (slugs.length === 0) return []

  const res = await fetch(`/api/events/by-slugs?slugs=${encodeURIComponent(slugs.join(','))}`)
  const json = (await res.json()) as BySlugsResponse

  return Array.isArray(json?.docs) ? json.docs : []
}

export default function SavedPageClient() {
  const [slugs, setSlugs] = useState<string[]>([])
  const [events, setEvents] = useState<EventDoc[] | null>(null)

  const previousSlugsRef = useRef<string[]>([])
  const requestIdRef = useRef(0)

  useEffect(() => {
    let active = true

    async function loadInitial() {
      const initialSlugs = getSavedSlugs()
      previousSlugsRef.current = initialSlugs
      setSlugs(initialSlugs)
      trackEvent('open_saved', { count: initialSlugs.length })

      if (initialSlugs.length === 0) {
        if (!active) return
        setEvents([])
        return
      }

      const requestId = ++requestIdRef.current
      const docs = await fetchEventsBySlugs(initialSlugs)

      if (!active || requestId !== requestIdRef.current) return
      setEvents(docs)
    }

    void loadInitial()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const unsubscribe = subscribeToSavedSlugs(async (nextSlugs) => {
      const previousSlugs = previousSlugsRef.current
      previousSlugsRef.current = nextSlugs

      setSlugs(nextSlugs)

      if (nextSlugs.length === 0) {
        setEvents([])
        return
      }

      // Instantly remove unsaved items from the current list
      setEvents((prev) => {
        if (!prev) return prev
        return prev.filter((event) => event.slug && nextSlugs.includes(event.slug))
      })

      // Only fetch newly added slugs
      const addedSlugs = nextSlugs.filter((slug) => !previousSlugs.includes(slug))

      if (addedSlugs.length === 0) {
        return
      }

      const requestId = ++requestIdRef.current
      const addedDocs = await fetchEventsBySlugs(addedSlugs)

      if (!active || requestId !== requestIdRef.current) return

      setEvents((prev) => {
        const merged = new Map<string, EventDoc>()

        for (const event of prev ?? []) {
          if (event.slug) merged.set(event.slug, event)
        }

        for (const event of addedDocs) {
          if (event.slug) merged.set(event.slug, event)
        }

        return nextSlugs
          .map((slug) => merged.get(slug))
          .filter((event): event is EventDoc => Boolean(event))
      })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

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
            title={event.title ?? 'Untitled event'}
            when={formatWhen(event.startAt)}
            where={venueName ?? event.neighborhood ?? null}
            price={formatPrice(event)}
            detailsUrl={detailsUrl ?? null}
            saveSlug={event.slug ?? null}
            image={event.image && typeof event.image === 'object' ? event.image : null}
          />
        )
      })}
    </div>
  )
}
