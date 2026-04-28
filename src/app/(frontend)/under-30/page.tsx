import type { Metadata } from 'next'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { EventPickCard } from '@/components/EventPickCard'
import React from 'react'
import {
  formatPrice,
  formatWhen,
  getLatestPublishedWeekendDrop,
  getWeekendDropItemsBySection,
} from '@/lib/weekendDrop'

export const metadata: Metadata = {
  title: 'Things to Do in Vancouver This Weekend Under $30 | MyCityWeekends',
  description:
    'Find affordable things to do in Vancouver this weekend for under $30. Curated picks for fast, budget-friendly plans.',
  alternates: {
    canonical: '/under-30',
  },
  openGraph: mergeOpenGraph({
    title: 'Things to Do in Vancouver This Weekend Under $30 | MyCityWeekends',
    description:
      'Find affordable things to do in Vancouver this weekend for under $30. Curated picks for fast, budget-friendly plans.',
    url: '/under-30',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Things to Do in Vancouver This Weekend Under $30 | MyCityWeekends',
    description:
      'Find affordable things to do in Vancouver this weekend for under $30. Curated picks for fast, budget-friendly plans.',
  },
}

export const dynamic = 'force-dynamic'

export default async function Under30Page() {
  const drop = await getLatestPublishedWeekendDrop()

  if (!drop) {
    return (
      <div className="pt-6 md:pt-8">
        <div className="container space-y-6">
          <h1 className="text-2xl font-semibold">Under $30</h1>
          <p className="text-black/70 dark:text-white/70">No weekend drop published yet.</p>
        </div>
      </div>
    )
  }

  const items = await getWeekendDropItemsBySection(drop.id, 'under30', 50)

  return (
    <div className="pt-6 md:pt-8">
      <div className="container space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Under $30</h1>
          <p className="text-black/70 dark:text-white/70">Updated weekly.</p>
        </header>

        {items.length === 0 ? (
          <p className="text-black/70 dark:text-white/70">
            No under-$30 picks added yet for this weekend.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const event = item.event && typeof item.event === 'object' ? item.event : null

              if (!event) {
                return (
                  <article key={item.id} className="rounded-xl border p-4">
                    <h3 className="text-base font-semibold">Event not available</h3>
                    <p className="text-sm text-black/70 dark:text-white/70">
                      This event may still be a draft or missing.
                    </p>
                  </article>
                )
              }

              const price = formatPrice(event)
              const when = formatWhen(event.startAt)

              return (
                <EventPickCard
                  key={item.id}
                  rank={item.rank ?? null}
                  title={event.title ?? 'Untitled event'}
                  when={when}
                  where={event.neighborhood ?? null}
                  price={price}
                  whyWorthIt={item.whyWorthIt ?? null}
                  internalHref={event.slug ? `/event/${event.slug}` : null}
                  saveSlug={event.slug ?? null}
                  image={event.image && typeof event.image === 'object' ? event.image : null}
                  description={event.description ?? item.whyWorthIt ?? null}
                  tags={Array.isArray(event.tags) ? event.tags : null}
                  venueName={
                    event.venue && typeof event.venue === 'object'
                      ? (event.venue.name ?? null)
                      : null
                  }
                  backHref="/under-30"
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
