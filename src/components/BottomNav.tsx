'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { trackEvent } from '@/lib/ga'

const items = [
  { href: '/', label: 'Weekend' },
  { href: '/free', label: 'Free' },
  { href: '/under-15', label: 'Under $15' },
  { href: '/saved', label: 'Saved' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-white/95 backdrop-blur dark:bg-black/70"
    >
      <div
        className="container flex h-16 items-center justify-around gap-2 py-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {items.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              onClick={() => trackEvent('bottom_nav_click', { label: item.label, href: item.href })}
              key={item.href}
              href={item.href}
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10',
              ].join(' ')}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
