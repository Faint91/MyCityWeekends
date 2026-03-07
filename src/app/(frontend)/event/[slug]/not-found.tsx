import Link from 'next/link'
import React from 'react'

export default function EventNotFound() {
  return (
    <div className="pt-24">
      <div className="container space-y-4">
        <h1 className="text-2xl font-semibold">Event not found</h1>
        <p className="text-black/70 dark:text-white/70">
          This link might be old or the event is no longer published.
        </p>
        <Link className="underline" href="/">
          Back to this weekend
        </Link>
      </div>
    </div>
  )
}
