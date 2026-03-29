import type { Metadata } from 'next/types'
import React from 'react'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import PageClient from './page.client'
import SearchBarClient from './SearchBarClient'
import { EventPickCard } from '@/components/EventPickCard'
import { formatPrice, formatWhen, getVenueName } from '@/lib/weekendDrop'

export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{
    q?: string
  }>
}

export default async function SearchPage({ searchParams: searchParamsPromise }: Args) {
  const { q = '' } = await searchParamsPromise
  const query = q.trim()

  const payload = await getPayload({ config: configPromise })

  const results = await payload.find({
    collection: 'events',
    depth: 1,
    draft: false,
    limit: 24,
    sort: 'startAt',
    ...(query
      ? {
          where: {
            or: [
              { title: { like: query } },
              { description: { like: query } },
              { neighborhood: { like: query } },
            ],
          },
        }
      : {}),
  })

  return (
    <div className="pt-6 md:pt-8 pb-24">
      <PageClient />

      <div className="container mb-10 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Search events</h1>
          <p className="text-black/70 dark:text-white/70">
            Search Vancouver events by title, neighborhood, or description.
          </p>
        </div>

        <div className="mx-auto max-w-[50rem]">
          <SearchBarClient initialQuery={query} />
        </div>
      </div>

      <div className="container">
        {!query ? (
          <p className="text-black/70 dark:text-white/70">Enter a search term to find events.</p>
        ) : results.docs.length > 0 ? (
          <div className="space-y-3">
            {results.docs.map((event) => (
              <EventPickCard
                key={event.id}
                title={event.title ?? 'Untitled event'}
                when={formatWhen(event.startAt)}
                where={getVenueName(event) ?? event.neighborhood ?? null}
                price={formatPrice(event)}
                whyWorthIt={event.description ?? null}
                detailsUrl={event.ticketUrl ?? event.sourceUrl ?? null}
                internalHref={event.slug ? `/event/${event.slug}` : null}
                saveSlug={event.slug ?? null}
                image={event.image && typeof event.image === 'object' ? event.image : null}
              />
            ))}
          </div>
        ) : (
          <p className="text-black/70 dark:text-white/70">No events found.</p>
        )}
      </div>
    </div>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Search events | MyCityWeekends',
  }
}
