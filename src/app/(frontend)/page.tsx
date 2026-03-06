import type { Metadata } from 'next'
import React from 'react'
import {
  formatPrice,
  formatWhen,
  getLatestPublishedWeekendDrop,
  getVenueName,
  getWeekendDropTop3Items,
} from '@/lib/weekendDrop'

export const metadata: Metadata = {
  title: 'MyCityWeekends — Vancouver weekend (budget picks)',
  description: 'Three great free/cheap things to do in Vancouver this weekend. Updated weekly.',
}

// Keep it simple + reliable while we iterate
export const dynamic = 'force-dynamic'

export default async function WeekendPage() {
  const drop = await getLatestPublishedWeekendDrop()

  // Empty state (important for CI/test DB and early prod)
  if (!drop) {
    return (
      <div className="pt-24">
        <div className="container space-y-6">
          <h1 className="text-2xl font-semibold">This weekend in Vancouver</h1>
          <p className="text-black/70 dark:text-white/70">No weekend drop published yet.</p>
        </div>
      </div>
    )
  }

  const top3 = await getWeekendDropTop3Items(drop.id)

  return (
    <div className="pt-24">
      <div className="container space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">This weekend in Vancouver</h1>
          <p className="text-black/70 dark:text-white/70">
            Budget picks. Fast choices. Updated weekly.
          </p>
        </header>

        <section aria-label="Top 3 picks" className="space-y-3">
          <h2 className="text-lg font-semibold">Top 3</h2>

          {top3.length === 0 ? (
            <p className="text-black/70 dark:text-white/70">
              No Top 3 items yet for this weekend drop.
            </p>
          ) : (
            <div className="space-y-3">
              {top3.map((item) => {
                const event = item.event && typeof item.event === 'object' ? item.event : null
                if (!event) {
                  return (
                    <article key={item.id} className="rounded-xl border p-4">
                      <h3 className="text-base font-semibold">Event not available</h3>
                      <p className="text-sm text-black/70 dark:text-white/70">
                        This event is likely still a draft. Publish it in Admin → Events.
                      </p>
                    </article>
                  )
                }

                const price = formatPrice(event)
                const when = formatWhen(event.startAt)
                const venueName = getVenueName(event)

                return (
                  <article key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm text-black/60 dark:text-white/60">
                          #{item.rank ?? ''}
                        </div>

                        <h3 className="truncate text-base font-semibold">
                          {event.title ?? 'Untitled event'}
                        </h3>

                        <div className="text-sm text-black/70 dark:text-white/70">
                          {when ? <span>{when}</span> : null}
                          {when && (venueName || event.neighborhood) ? ' • ' : null}
                          {venueName ? (
                            <span>{venueName}</span>
                          ) : event.neighborhood ? (
                            <span>{event.neighborhood}</span>
                          ) : null}
                        </div>

                        {item.whyWorthIt ? <p className="text-sm">{item.whyWorthIt}</p> : null}
                      </div>

                      <div className="shrink-0 rounded-full border px-3 py-1 text-sm font-medium">
                        {price}
                      </div>
                    </div>

                    {event.ticketUrl || event.sourceUrl ? (
                      <div className="mt-3">
                        <a
                          className="text-sm underline"
                          href={(event.ticketUrl ?? event.sourceUrl) as string}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View details
                        </a>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
