import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import type { Footer as FooterType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'

export async function Footer() {
  const footerData: FooterType = await getCachedGlobal('footer', 1)()
  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto border-t border-border bg-black text-white dark:bg-card">
      <div className="container flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between">
        <div className="w-full min-w-0 md:w-auto">
          <Link href="/" className="block w-full">
            <div className="flex flex-col items-start min-w-0">
              <div className="w-[170px] sm:w-[190px]">
                <Logo sizes="190px" />
              </div>

              <span className="mt-2 block max-w-full text-xs text-white/70 sm:text-sm md:whitespace-nowrap">
                Curated cheap and free things to do in Vancouver this weekend.
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex flex-col gap-3 md:flex-row md:gap-6">
          {navItems.map(({ link }, i) => {
            return <CMSLink className="text-white/90 hover:text-white" key={i} {...link} />
          })}
        </nav>
      </div>
    </footer>
  )
}
