import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'Curated cheap and free things to do in Vancouver this weekend for fast, budget-friendly plans.',
  images: [
    {
      url: `${getServerSideURL()}/og-default.png`,
      width: 1200,
      height: 630,
      alt: 'Cheap & free things to do in Vancouver this weekend | MyCityWeekends',
    },
  ],
  siteName: 'MyCityWeekends',
  title: 'MyCityWeekends',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
