import type { Metadata } from 'next'
import { EventPickCard } from '@/components/EventPickCard'
import React from 'react'
import {
  formatPrice,
  formatWhen,
  getLatestPublishedWeekendDrop,
  getVenueName,
  getWeekendDropItemsBySection,
} from '@/lib/weekendDrop'

export const metadata: Metadata = {
  title: 'Free this weekend — MyCityWeekends',
  description: 'Free things to do in Vancouver this weekend.',
}

export const dynamic = 'force-dynamic'

export default async function FreePage() {
  const drop = await getLatestPublishedWeekendDrop()

  if (!drop) {
    return (
      <div className="pt-24">
        <div className="container space-y-6">
          <h1 className="text-2xl font-semibold">Free this weekend</h1>
          <p className="text-black/70 dark:text-white/70">No weekend drop published yet.</p>
        </div>
      </div>
    )
  }

  const items = await getWeekendDropItemsBySection(drop.id, 'free', 50)

  return (
    <div className="pt-24">
      <div className="container space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Free this weekend</h1>
          <p className="text-black/70 dark:text-white/70">Updated weekly.</p>
        </header>

        {items.length === 0 ? (
          <p className="text-black/70 dark:text-white/70">
            No free picks added yet for this weekend.
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
              const venueName = getVenueName(event)

              const detailsUrl = (event.ticketUrl ?? event.sourceUrl) as string | undefined

              return (
                <EventPickCard
                  key={item.id}
                  rank={item.rank ?? null}
                  title={event.title ?? 'Untitled event'}
                  when={when}
                  where={venueName ?? event.neighborhood ?? null}
                  price={price}
                  whyWorthIt={item.whyWorthIt ?? null}
                  detailsUrl={detailsUrl ?? null}
                  internalHref={event.slug ? `/event/${event.slug}` : null}
                  saveSlug={event.slug ?? null}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
