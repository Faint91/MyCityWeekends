'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/ga'

export default function SearchBarClient({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = q.trim()
    trackEvent('search_submit', { q: trimmed })

    if (!trimmed) {
      router.push('/search')
      return
    }

    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2 justify-center">
      <label className="sr-only" htmlFor="search-q">
        Search
      </label>
      <input
        id="search-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        className="w-full max-w-[36rem] rounded-lg border px-3 py-2"
      />
      <button className="rounded-lg border px-4 py-2 font-medium" type="submit">
        Search
      </button>
    </form>
  )
}
