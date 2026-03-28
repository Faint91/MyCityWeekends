'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { getGAId } from '@/lib/gaConfig'

export function GA4PageView() {
  const id = getGAId()
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
