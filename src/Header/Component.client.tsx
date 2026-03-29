'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
  }, [pathname, setHeaderTheme])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
  }, [headerTheme, theme])

  return (
    <header className="container relative z-20" {...(theme ? { 'data-theme': theme } : {})}>
      <div className="flex flex-col gap-3 pt-5 pb-1 md:gap-4 md:pt-6 md:pb-2">
        <Link href="/" className="block w-full max-w-[760px]">
          <div className="w-full">
            <Logo
              loading="eager"
              priority="high"
              sizes="(min-width: 1280px) 760px, (min-width: 768px) 62vw, 92vw"
            />
          </div>
        </Link>

        <div className="flex justify-start md:justify-end">
          <HeaderNav data={data} />
        </div>
      </div>
    </header>
  )
}
