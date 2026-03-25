import type { Metadata } from 'next'

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <GA4 />
        <GA4PageView />
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />
          <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))]">
            <Header />
            {children}
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
