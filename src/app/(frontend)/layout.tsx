import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'
import { BottomNav } from '@/components/BottomNav'
import { GA4 } from '@/components/GA4'
import { GA4PageView } from '@/components/GA4PageView'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
      </head>
      <body>
        <GA4 />
        <Suspense fallback={null}>
          <GA4PageView />
        </Suspense>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />
          <div
            data-theme="dark"
            className="mcw-site-shell min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]"
          >
            <Header />
            <div
              className="md:pb-0"
              style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
            >
              <main className="lg:mx-auto lg:w-full lg:max-w-[880px]">{children}</main>
            </div>
            <div className="mt-12">
              <Footer />
            </div>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return new URL(getServerSideURL())
    } catch {
      return new URL('https://my-city-weekends.vercel.app')
    }
  })(),
  title: {
    default: 'MyCityWeekends',
    template: '%s | MyCityWeekends',
  },
  description:
    'Curated cheap and free things to do in Vancouver this weekend for fast, budget-friendly plans.',
  openGraph: mergeOpenGraph({
    title: 'MyCityWeekends',
    description:
      'Curated cheap and free things to do in Vancouver this weekend for fast, budget-friendly plans.',
    url: '/',
  }),
  twitter: {
    card: 'summary_large_image',
  },
}
