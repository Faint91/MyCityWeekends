const SITE_URL = 'https://mycityweekends.com'

const CORE_PUBLIC_PATHS = ['/', '/free', '/under-30']

function isAllowedPublicPage(path) {
  if (CORE_PUBLIC_PATHS.includes(path)) return true
  if (path.startsWith('/event/')) return true

  return false
}

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: [
    '/admin',
    '/admin/*',
    '/api/*',
    '/saved',
    '/search',
    '/under-15',
    '/apple-icon.png',
    '/favicon.ico',
    '/*.png',
    '/*.jpg',
    '/*.jpeg',
    '/*.webp',
    '/*.svg',
    '/*.ico',
  ],
  transform: async (config, path) => {
    if (!isAllowedPublicPage(path)) {
      return null
    }

    return {
      loc: path,
      changefreq: path.startsWith('/event/') ? 'weekly' : 'daily',
      priority: path === '/' ? 1.0 : path.startsWith('/event/') ? 0.8 : 0.9,
      lastmod: new Date().toISOString(),
    }
  },
  additionalPaths: async (config) => {
    return CORE_PUBLIC_PATHS.map((path) => ({
      loc: path,
      changefreq: 'daily',
      priority: path === '/' ? 1.0 : 0.9,
      lastmod: new Date().toISOString(),
    }))
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        disallow: ['/admin', '/admin/*', '/api/*', '/saved', '/search'],
      },
    ],
  },
}
