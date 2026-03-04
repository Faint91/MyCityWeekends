import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Free this weekend — MyCityWeekends',
  description: 'Free things to do in Vancouver this weekend.',
}

export default function FreePage() {
  return (
    <div className="pt-24 pb-24">
      <div className="container space-y-4">
        <h1 className="text-2xl font-semibold">Free this weekend</h1>
        <p className="text-black/70 dark:text-white/70">Coming soon.</p>
      </div>
    </div>
  )
}
