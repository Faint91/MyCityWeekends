import type { Metadata } from 'next'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { EventPickCard } from '@/components/EventPickCard'
import React from 'react'
import {
  formatPrice,
  formatWhen,
  getLatestPublishedWeekendDrop,
  getWeekendDropTop3Items,
} from '@/lib/weekendDrop'

export const metadata: Metadata = {
  title: 'Cheap & Free Things to Do in Vancouver This Weekend | MyCityWeekends',
  description:
    'Discover curated cheap and free things to do in Vancouver this weekend. Fast picks for students and budget-conscious locals.',
  alternates: {
    canonical: '/',
  },
  openGraph: mergeOpenGraph({
    title: 'Cheap & Free Things to Do in Vancouver This Weekend | MyCityWeekends',
    description:
      'Discover curated cheap and free things to do in Vancouver this weekend. Fast picks for students and budget-conscious locals.',
    url: '/',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Cheap & Free Things to Do in Vancouver This Weekend | MyCityWeekends',
    description:
      'Discover curated cheap and free things to do in Vancouver this weekend. Fast picks for students and budget-conscious locals.',
  },
}

// Keep it simple + reliable while we iterate
export const dynamic = 'force-dynamic'

export default async function WeekendPage() {
  const drop = await getLatestPublishedWeekendDrop()

  // Empty state (important for CI/test DB and early prod)
  if (!drop) {
    return (
      <div className="pt-6 md:pt-8">
        <div className="container space-y-6">
          <h1 className="text-2xl font-semibold">This weekend in Vancouver</h1>
          <p className="text-black/70 dark:text-white/70">No weekend drop published yet.</p>
        </div>
      </div>
    )
  }

  const top3 = await getWeekendDropTop3Items(drop.id)

  return (
    <div className="pt-6 md:pt-8">
      <div className="container space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">This weekend in Vancouver</h1>
          <p className="text-black/70 dark:text-white/70">
            Budget picks. Fast choices. Updated weekly.
          </p>
        </header>

        <section aria-label="Top 3 picks" className="space-y-3">
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

                const detailsUrl = (event.ticketUrl ?? event.sourceUrl) as string | undefined

                return (
                  <EventPickCard
                    key={item.id}
                    rank={item.rank ?? null}
                    title={event.title ?? 'Untitled event'}
                    when={when}
                    where={event.neighborhood ?? null}
                    price={price}
                    whyWorthIt={item.whyWorthIt ?? null}
                    detailsUrl={detailsUrl ?? null}
                    internalHref={event.slug ? `/event/${event.slug}` : null}
                    saveSlug={event.slug ?? null}
                    image={event.image && typeof event.image === 'object' ? event.image : null}
                    backHref="/"
                  />
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
