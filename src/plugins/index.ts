import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import type { Plugin } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'

type SeoDoc = {
  title?: string | null
  slug?: string | null
}

const generateTitle: GenerateTitle<SeoDoc> = ({ doc }) => {
  return doc?.title ? `${doc.title} | MyCityWeekends` : 'MyCityWeekends'
}

const generateURL: GenerateURL<SeoDoc> = ({ doc }) => {
  const url = getServerSideURL()
  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
]
