import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Under $15 — MyCityWeekends',
  description: 'Cheap things to do in Vancouver this weekend (under $15).',
}

export default function Under15Page() {
  return (
    <div className="pt-24 pb-24">
      <div className="container space-y-4">
        <h1 className="text-2xl font-semibold">Under $15</h1>
        <p className="text-black/70 dark:text-white/70">Coming soon.</p>
      </div>
    </div>
  )
}
