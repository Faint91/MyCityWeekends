import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const dynamic = 'force-static'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'MyCityWeekends — Vancouver weekend (budget picks)',
  description: 'Three great free/cheap things to do in Vancouver this weekend. Updated weekly.',
}

export default function WeekendPage() {
  return (
    <div className="pt-24 pb-24">
      <div className="container space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">This weekend in Vancouver</h1>
          <p className="text-black/70 dark:text-white/70">
            Budget picks. Fast choices. Updated weekly.
          </p>
        </header>

        <section aria-label="Top 3 picks" className="space-y-3">
          <h2 className="text-lg font-semibold">Top 3 (coming soon)</h2>

          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="h-4 w-56 rounded bg-black/10 dark:bg-white/10" />
                  <div className="h-3 w-40 rounded bg-black/10 dark:bg-white/10" />
                </div>
                <div className="h-8 w-20 rounded-full bg-black/10 dark:bg-white/10" />
              </div>
            </div>
          ))}
        </section>

        <section aria-label="Browse sections" className="space-y-2">
          <h2 className="text-lg font-semibold">Browse</h2>
          <div className="flex flex-wrap gap-3">
            <Link className="underline" href="/free">
              Free this weekend
            </Link>
            <Link className="underline" href="/under-15">
              Under $15
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
