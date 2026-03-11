'use client'

import React, { useEffect, useState } from 'react'
import { isSaved, toggleSaved } from '@/lib/savedEvents'
import { trackEvent } from '@/lib/ga'

export function SaveToggleButton({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(isSaved(slug))

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mycityweekends:saved_slugs') setSaved(isSaved(slug))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [slug])

  const onClick = () => {
    const nowSaved = toggleSaved(slug)
    setSaved(nowSaved)
    trackEvent(nowSaved ? 'save_event' : 'unsave_event', { slug })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-4 py-2 text-sm font-medium"
      aria-label={saved ? 'Unsave event' : 'Save event'}
      data-testid="save-toggle"
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
