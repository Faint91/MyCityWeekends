export type ExtractImageOptions = {
  timeoutMs?: number
  eventTitle?: string | null
  eventDescription?: string | null
}

export type ImageCandidateSource = 'meta' | 'link' | 'jsonLd' | 'img' | 'background'

type RawImageCandidate = {
  url: string
  source: ImageCandidateSource
  context?: string
  index: number
}

type NormalizedImageCandidate = RawImageCandidate & {
  normalizedUrl: string
  score: number
}

export type RankedImageCandidate = {
  url: string
  source: ImageCandidateSource
  score: number
  context?: string
  index: number
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'walk',
  'walks',
  'event',
  'events',
  'festival',
  'vancouver',
])

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function cleanSearchText(value: string): string {
  return decodeHtmlEntities(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSignificantWords(value: string | null | undefined): string[] {
  const cleaned = value ? cleanSearchText(value) : ''
  if (!cleaned) return []

  return cleaned
    .split(' ')
    .filter((word) => word.length >= 4)
    .filter((word) => !STOP_WORDS.has(word))
}

function getHtmlAttribute(tag: string, attributeName: string): string | null {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, 'i')
  return cleanString(tag.match(pattern)?.[1])
}

function pushCandidate(
  values: RawImageCandidate[],
  value: string | null | undefined,
  source: RawImageCandidate['source'],
  index: number,
  context?: string,
): void {
  const cleaned = cleanString(value)
  if (!cleaned) return

  values.push({
    url: decodeHtmlEntities(cleaned),
    source,
    index,
    context,
  })
}

function looksRejectedImageUrl(imageUrl: string): boolean {
  return /logo|avatar|icon|favicon|sprite|placeholder|transparent|blank|apple-touch-icon/i.test(
    imageUrl,
  )
}

function tryBuildUrl(value: string): URL | null {
  const cleaned = cleanString(decodeHtmlEntities(value))
  if (!cleaned) return null

  try {
    if (cleaned.startsWith('//')) {
      return new URL(`https:${cleaned}`)
    }

    return new URL(cleaned)
  } catch {
    return null
  }
}

function isKnownImageHost(host: string): boolean {
  return /img\.evbuc\.com|images\.ctfassets\.net|images\.squarespace-cdn\.com|static\.wixstatic\.com|res\.cloudinary\.com|cloudinary\.com|cloudfront\.net|imgix\.net|ticketmaster|ticketm\.net|tmimgs|tmol\.io|cdn\.prod\.website-files\.com|assets\.simpleviewinc\.com|cdn\.|googleusercontent\.com|ggpht\.com/i.test(
    host,
  )
}

function isGoogleHostedImageUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  const pathname = url.pathname.toLowerCase()

  if (!/googleusercontent\.com$|ggpht\.com$/i.test(host)) return false

  return (
    pathname.includes('/sitesv/') ||
    pathname.includes('/pw/') ||
    pathname.includes('/proxy/') ||
    pathname.includes('/usercontent/') ||
    pathname.length > 24
  )
}

function unwrapKnownImageProxyUrl(url: URL): string | null {
  const pathname = url.pathname.toLowerCase()
  const looksLikeProxy =
    pathname.includes('/_next/image') ||
    pathname.includes('/imageproxy') ||
    pathname.includes('/image-proxy') ||
    pathname.includes('/cdn-cgi/image')

  if (!looksLikeProxy) return null

  const nested =
    url.searchParams.get('url') ??
    url.searchParams.get('src') ??
    url.searchParams.get('image') ??
    url.searchParams.get('img')

  return cleanString(nested ? decodeURIComponent(nested) : null)
}

function looksLikeDirectImageAssetUrl(imageUrl: string | null): boolean {
  if (!imageUrl) return false
  if (looksRejectedImageUrl(imageUrl)) return false

  const url = tryBuildUrl(imageUrl)
  if (!url) return false

  const pathname = url.pathname.toLowerCase()
  const search = url.search.toLowerCase()
  const host = url.hostname.toLowerCase()

  const hasImageExtension =
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.avif')

  if (hasImageExtension) return true

  if (isGoogleHostedImageUrl(url)) return true

  const hasImageStyleQuery = /format=|fm=|auto=format|w=|width=|q=|quality=|fit=|crop=/.test(search)
  const hasImagePathSignal =
    /image|images|img|photo|photos|media|upload|uploads|poster|hero|banner|dam|artist|event/.test(
      pathname,
    )

  return isKnownImageHost(host) && (hasImageStyleQuery || hasImagePathSignal)
}

export function normalizeRemoteImageUrl(imageUrl: string | null | undefined): string | null {
  const cleaned = cleanString(imageUrl)
  if (!cleaned) return null

  const decoded = decodeHtmlEntities(cleaned)
  const parsed = tryBuildUrl(decoded)

  if (!parsed) {
    return looksLikeDirectImageAssetUrl(decoded) ? decoded : null
  }

  const unwrapped = unwrapKnownImageProxyUrl(parsed)
  if (unwrapped) {
    return normalizeRemoteImageUrl(unwrapped)
  }

  const normalized = parsed.toString()
  return looksLikeDirectImageAssetUrl(normalized) ? normalized : null
}

function getHtmlContext(html: string, index: number, radius = 1_200): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(html.length, index + radius)

  return html.slice(start, end)
}

function collectMetaImageUrls(html: string): RawImageCandidate[] {
  const values: RawImageCandidate[] = []
  const metaTags = Array.from(html.matchAll(/<meta\b[^>]*>/gi))

  for (const match of metaTags) {
    const tag = match[0]
    const index = match.index ?? 0
    const key =
      getHtmlAttribute(tag, 'property') ??
      getHtmlAttribute(tag, 'name') ??
      getHtmlAttribute(tag, 'itemprop')

    if (!key) continue

    const normalizedKey = key.toLowerCase()
    const isImageMeta = [
      'og:image',
      'og:image:url',
      'og:image:secure_url',
      'twitter:image',
      'twitter:image:src',
      'thumbnail',
      'image',
    ].includes(normalizedKey)

    if (!isImageMeta) continue

    pushCandidate(
      values,
      getHtmlAttribute(tag, 'content'),
      'meta',
      index,
      getHtmlContext(html, index),
    )
  }

  return values
}

function collectLinkImageUrls(html: string): RawImageCandidate[] {
  const values: RawImageCandidate[] = []
  const linkTags = Array.from(html.matchAll(/<link\b[^>]*>/gi))

  for (const match of linkTags) {
    const tag = match[0]
    const index = match.index ?? 0
    const rel = getHtmlAttribute(tag, 'rel')?.toLowerCase()
    if (rel !== 'image_src') continue

    pushCandidate(values, getHtmlAttribute(tag, 'href'), 'link', index, getHtmlContext(html, index))
  }

  return values
}

function collectImageValue(
  value: unknown,
  values: RawImageCandidate[],
  index: number,
  context?: string,
): void {
  if (typeof value === 'string') {
    pushCandidate(values, value, 'jsonLd', index, context)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageValue(item, values, index, context)
    }
    return
  }

  if (!value || typeof value !== 'object') return

  const objectValue = value as Record<string, unknown>
  collectImageValue(objectValue.url, values, index, context)
  collectImageValue(objectValue.contentUrl, values, index, context)
  collectImageValue(objectValue.thumbnailUrl, values, index, context)
}

function collectJsonLdImageUrlsFromValue(
  value: unknown,
  values: RawImageCandidate[],
  index: number,
  context?: string,
): void {
  if (!value || typeof value !== 'object') return

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLdImageUrlsFromValue(item, values, index, context)
    }
    return
  }

  const objectValue = value as Record<string, unknown>

  collectImageValue(objectValue.image, values, index, context)
  collectImageValue(objectValue.thumbnailUrl, values, index, context)
  collectImageValue(objectValue.photo, values, index, context)

  const typeValue = objectValue['@type']
  const types = Array.isArray(typeValue) ? typeValue : [typeValue]
  const isImageObject = types.some(
    (type) => typeof type === 'string' && type.toLowerCase() === 'imageobject',
  )

  if (isImageObject) {
    collectImageValue(objectValue.url, values, index, context)
    collectImageValue(objectValue.contentUrl, values, index, context)
  }

  collectJsonLdImageUrlsFromValue(objectValue['@graph'], values, index, context)
  collectJsonLdImageUrlsFromValue(objectValue.event, values, index, context)
  collectJsonLdImageUrlsFromValue(objectValue.mainEntity, values, index, context)
}

function collectJsonLdImageUrls(html: string): RawImageCandidate[] {
  const values: RawImageCandidate[] = []
  const scriptMatches = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const match of scriptMatches) {
    const rawJson = cleanString(match[1])
    const index = match.index ?? 0
    if (!rawJson) continue

    try {
      const parsed = JSON.parse(decodeHtmlEntities(rawJson))
      collectJsonLdImageUrlsFromValue(parsed, values, index, getHtmlContext(html, index))
    } catch {
      // Some sites ship invalid JSON-LD. Ignore and keep other image sources.
    }
  }

  return values
}

function parseSrcSet(srcset: string | null): string[] {
  if (!srcset) return []

  return srcset
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter((value): value is string => Boolean(value))
}

function collectImgTagUrls(html: string): RawImageCandidate[] {
  const values: RawImageCandidate[] = []
  const imgTags = Array.from(html.matchAll(/<img\b[^>]*>/gi))

  for (const match of imgTags) {
    const tag = match[0]
    const index = match.index ?? 0
    const context = `${getHtmlContext(html, index)} ${tag}`

    const src =
      getHtmlAttribute(tag, 'src') ??
      getHtmlAttribute(tag, 'data-src') ??
      getHtmlAttribute(tag, 'data-original') ??
      getHtmlAttribute(tag, 'data-image') ??
      getHtmlAttribute(tag, 'data-lazy-src')

    const srcset = getHtmlAttribute(tag, 'srcset') ?? getHtmlAttribute(tag, 'data-srcset')

    pushCandidate(values, src, 'img', index, context)

    for (const srcsetUrl of parseSrcSet(srcset)) {
      pushCandidate(values, srcsetUrl, 'img', index, context)
    }
  }

  return values
}

function collectBackgroundImageUrls(html: string): RawImageCandidate[] {
  const values: RawImageCandidate[] = []
  const matches = html.matchAll(/background-image\s*:\s*url\((["']?)([^"')]+)\1\)/gi)

  for (const match of matches) {
    const value = cleanString(match[2])
    const index = match.index ?? 0
    if (!value) continue

    pushCandidate(values, value, 'background', index, getHtmlContext(html, index))
  }

  return values
}

function unescapeLikelyUrl(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
}

function collectLooseEmbeddedImageUrls(html: string): RawImageCandidate[] {
  const values: RawImageCandidate[] = []
  const searchableHtml = unescapeLikelyUrl(html)

  const patterns = [
    /https?:\/\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'\s<>]*)?/gi,
    /https?:\/\/[^"'\s<>]*(?:ticketm|ticketmaster|tmol|tmimgs|evbuc|cloudinary|squarespace|googleusercontent|ggpht)[^"'\s<>]+/gi,
  ]

  for (const pattern of patterns) {
    for (const match of searchableHtml.matchAll(pattern)) {
      const rawValue = cleanString(match[0])
      const index = match.index ?? 0
      if (!rawValue) continue

      const value = unescapeLikelyUrl(rawValue)

      if (
        !/image|images|img|photo|photos|poster|hero|banner|event|dam|artist|ticketm|tmol|tmimgs|ticketmaster|evbuc|cloudinary|squarespace|googleusercontent|ggpht/i.test(
          value,
        )
      ) {
        continue
      }

      pushCandidate(values, value, 'img', index, getHtmlContext(searchableHtml, index))
    }
  }

  return values
}

function scoreImageCandidate(candidate: RawImageCandidate, options: ExtractImageOptions): number {
  let score = 0

  switch (candidate.source) {
    case 'meta':
      score += 90
      break
    case 'jsonLd':
      score += 80
      break
    case 'link':
      score += 70
      break
    case 'background':
      score += 45
      break
    case 'img':
      score += 35
      break
  }

  const context = cleanSearchText(candidate.context ?? '')
  const url = cleanSearchText(candidate.url)

  const eventTitleWords = getSignificantWords(options.eventTitle)
  const eventDescriptionWords = getSignificantWords(options.eventDescription).slice(0, 8)

  const titleHits = eventTitleWords.filter((word) => context.includes(word) || url.includes(word))
  const descriptionHits = eventDescriptionWords.filter((word) => context.includes(word))

  score += Math.min(100, titleHits.length * 24)
  score += Math.min(36, descriptionHits.length * 8)

  const fullTitle = options.eventTitle ? cleanSearchText(options.eventTitle) : ''
  if (fullTitle) {
    const titleIndex = context.indexOf(fullTitle)
    const urlIndex = context.indexOf(url)

    if (titleIndex >= 0) {
      // Prefer images that appear inside/after the matching event title block.
      // A generic page image can still be near the title, but if it appears before
      // the title it should not beat the event-specific image.
      if (urlIndex >= 0 && titleIndex <= urlIndex) {
        score += 110

        const distance = Math.abs(urlIndex - titleIndex)
        score += Math.max(0, 50 - Math.floor(distance / 20))
      } else {
        score += 20
      }
    }
  }

  if (
    /hero|poster|event|banner|cover|main|photo|image|walk|schedule/i.test(candidate.context ?? '')
  ) {
    score += 25
  }

  if (
    /header|navigation|navbar|menu|logo|site-title|search this site|skip to navigation/i.test(
      candidate.context ?? '',
    )
  ) {
    score -= 65
  }

  if (/logo|icon|favicon|avatar/i.test(candidate.context ?? '')) {
    score -= 80
  }

  return score
}

function resolveAndScoreCandidates(
  rawCandidates: RawImageCandidate[],
  pageUrl: string,
  options: ExtractImageOptions,
): NormalizedImageCandidate[] {
  const seen = new Set<string>()
  const normalized: NormalizedImageCandidate[] = []

  for (const candidate of rawCandidates) {
    let resolved: string | null = null

    try {
      resolved = new URL(candidate.url, pageUrl).toString()
    } catch {
      resolved = null
    }

    const normalizedUrl = normalizeRemoteImageUrl(resolved)
    if (!normalizedUrl) continue
    if (seen.has(normalizedUrl)) continue

    seen.add(normalizedUrl)

    normalized.push({
      ...candidate,
      normalizedUrl,
      score: scoreImageCandidate(candidate, options),
    })
  }

  return normalized.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.index - b.index
  })
}

export function extractRankedImageCandidatesFromHtml(
  html: string,
  pageUrl: string,
  options: ExtractImageOptions = {},
): RankedImageCandidate[] {
  const rawCandidates = [
    ...collectMetaImageUrls(html),
    ...collectLinkImageUrls(html),
    ...collectJsonLdImageUrls(html),
    ...collectImgTagUrls(html),
    ...collectBackgroundImageUrls(html),
    ...collectLooseEmbeddedImageUrls(html),
  ]

  return resolveAndScoreCandidates(rawCandidates, pageUrl, options).map((candidate) => ({
    url: candidate.normalizedUrl,
    source: candidate.source,
    score: candidate.score,
    context: cleanString(candidate.context)?.slice(0, 800),
    index: candidate.index,
  }))
}

export function extractImageUrlsFromHtml(
  html: string,
  pageUrl: string,
  options: ExtractImageOptions = {},
): string[] {
  return extractRankedImageCandidatesFromHtml(html, pageUrl, options).map(
    (candidate) => candidate.url,
  )
}

export async function extractRankedImageCandidatesFromPage(
  pageUrl: string | null | undefined,
  options: ExtractImageOptions = {},
): Promise<RankedImageCandidate[]> {
  const normalizedPageUrl = cleanString(pageUrl)
  if (!normalizedPageUrl) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000)

  try {
    const response = await fetch(normalizedPageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyCityWeekendsBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (!response.ok) return []

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html')) return []

    const html = await response.text()
    return extractRankedImageCandidatesFromHtml(html, normalizedPageUrl, options)
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

export async function extractBestImageUrlFromPage(
  pageUrl: string | null | undefined,
  options: ExtractImageOptions = {},
): Promise<string | null> {
  return (await extractRankedImageCandidatesFromPage(pageUrl, options))[0]?.url ?? null
}
