import React from 'react'
import type { Metadata } from 'next'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import SavedPageClient from './saved.client'

export const metadata: Metadata = {
  title: 'Saved Weekend Picks | MyCityWeekends',
  description:
    'Review your saved Vancouver weekend picks and come back when you are ready to choose.',
  alternates: {
    canonical: '/saved',
  },
  openGraph: mergeOpenGraph({
    title: 'Saved Weekend Picks | MyCityWeekends',
    description:
      'Review your saved Vancouver weekend picks and come back when you are ready to choose.',
    url: '/saved',
  }),
  twitter: {
    card: 'summary_large_image',
    title: 'Saved Weekend Picks | MyCityWeekends',
    description:
      'Review your saved Vancouver weekend picks and come back when you are ready to choose.',
  },
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="pt-24 pb-24">
      <div className="container space-y-6">
        <h1 className="text-2xl font-semibold">Saved</h1>
        <SavedPageClient />
      </div>
    </div>
  )
}
