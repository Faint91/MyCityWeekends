import React from 'react'
import type { Metadata } from 'next'
import SavedPageClient from './saved.client'

export const metadata: Metadata = {
  title: 'Saved — MyCityWeekends',
  description: 'Your saved weekend picks.',
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
