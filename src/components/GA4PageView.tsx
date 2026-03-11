'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'

export function GA4PageView() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!id) return
    if (!window.gtag) return

    const qs = searchParams?.toString()
    const page_path = qs ? `${pathname}?${qs}` : pathname

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path,
    })
  }, [id, pathname, searchParams])

  return null
}
