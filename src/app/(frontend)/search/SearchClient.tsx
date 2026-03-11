'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

export default function SearchClient() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Search</h1>
      <p className="text-black/70 dark:text-white/70">
        Query: <span className="font-medium">{q || '(empty)'}</span>
      </p>
    </div>
  )
}
