type ExtractImageOptions = {
  timeoutMs?: number
}

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

function getHtmlAttribute(tag: string, attributeName: string): string | null {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, 'i')
  return cleanString(tag.match(pattern)?.[1])
}

function pushIfPresent(values: string[], value: string | null | undefined): void {
  const cleaned = cleanString(value)
  if (cleaned) values.push(decodeHtmlEntities(cleaned))
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

  const looksLikeKnownImageHost =
    /img\.evbuc\.com|images\.ctfassets\.net|images\.squarespace-cdn\.com|static\.wixstatic\.com|res\.cloudinary\.com|cloudinary\.com|cloudfront\.net|imgix\.net|ticketmaster|tmimgs|cdn\.prod\.website-files\.com|assets\.simpleviewinc\.com|cdn\./i.test(
      host,
    )

  const hasImageStyleQuery = /format=|fm=|auto=format|w=|width=|q=|quality=|fit=|crop=/.test(search)
  const hasImagePathSignal =
    /image|images|img|photo|photos|media|upload|uploads|poster|hero|banner/.test(pathname)

  return looksLikeKnownImageHost && (hasImageStyleQuery || hasImagePathSignal)
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

function collectMetaImageUrls(html: string): string[] {
  const values: string[] = []
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const tag of metaTags) {
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

    pushIfPresent(values, getHtmlAttribute(tag, 'content'))
  }

  return values
}

function collectLinkImageUrls(html: string): string[] {
  const values: string[] = []
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? []

  for (const tag of linkTags) {
    const rel = getHtmlAttribute(tag, 'rel')?.toLowerCase()
    if (rel !== 'image_src') continue

    pushIfPresent(values, getHtmlAttribute(tag, 'href'))
  }

  return values
}

function collectImageValue(value: unknown, values: string[]): void {
  if (typeof value === 'string') {
    pushIfPresent(values, value)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageValue(item, values)
    }
    return
  }

  if (!value || typeof value !== 'object') return

  const objectValue = value as Record<string, unknown>
  collectImageValue(objectValue.url, values)
  collectImageValue(objectValue.contentUrl, values)
  collectImageValue(objectValue.thumbnailUrl, values)
}

function collectJsonLdImageUrlsFromValue(value: unknown, values: string[]): void {
  if (!value || typeof value !== 'object') return

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLdImageUrlsFromValue(item, values)
    }
    return
  }

  const objectValue = value as Record<string, unknown>

  collectImageValue(objectValue.image, values)
  collectImageValue(objectValue.thumbnailUrl, values)
  collectImageValue(objectValue.photo, values)

  const typeValue = objectValue['@type']
  const types = Array.isArray(typeValue) ? typeValue : [typeValue]
  const isImageObject = types.some(
    (type) => typeof type === 'string' && type.toLowerCase() === 'imageobject',
  )

  if (isImageObject) {
    collectImageValue(objectValue.url, values)
    collectImageValue(objectValue.contentUrl, values)
  }

  collectJsonLdImageUrlsFromValue(objectValue['@graph'], values)
  collectJsonLdImageUrlsFromValue(objectValue.event, values)
  collectJsonLdImageUrlsFromValue(objectValue.mainEntity, values)
}

function collectJsonLdImageUrls(html: string): string[] {
  const values: string[] = []
  const scriptMatches = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const match of scriptMatches) {
    const rawJson = cleanString(match[1])
    if (!rawJson) continue

    try {
      const parsed = JSON.parse(decodeHtmlEntities(rawJson))
      collectJsonLdImageUrlsFromValue(parsed, values)
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

function collectHighConfidenceImgUrls(html: string): string[] {
  const values: string[] = []
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? []

  for (const tag of imgTags) {
    const descriptor = [
      getHtmlAttribute(tag, 'alt'),
      getHtmlAttribute(tag, 'class'),
      getHtmlAttribute(tag, 'id'),
      getHtmlAttribute(tag, 'data-testid'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const src =
      getHtmlAttribute(tag, 'src') ??
      getHtmlAttribute(tag, 'data-src') ??
      getHtmlAttribute(tag, 'data-original') ??
      getHtmlAttribute(tag, 'data-image')

    const srcset = getHtmlAttribute(tag, 'srcset') ?? getHtmlAttribute(tag, 'data-srcset')
    const srcSignals = [src, srcset].filter(Boolean).join(' ').toLowerCase()

    const looksEventSpecific =
      /event|poster|hero|main|banner|card|cover|thumbnail|photo|image/.test(descriptor) ||
      /event|poster|hero|banner|cover|upload|uploads|photos|images/.test(srcSignals)

    if (!looksEventSpecific) continue

    pushIfPresent(values, src)
    for (const srcsetUrl of parseSrcSet(srcset)) {
      pushIfPresent(values, srcsetUrl)
    }
  }

  return values
}

function collectBackgroundImageUrls(html: string): string[] {
  const values: string[] = []
  const matches = html.matchAll(/background-image\s*:\s*url\((["']?)([^"')]+)\1\)/gi)

  for (const match of matches) {
    const value = cleanString(match[2])
    if (!value) continue

    if (/event|poster|hero|banner|cover|upload|uploads|photos|images/i.test(value)) {
      pushIfPresent(values, value)
    }
  }

  return values
}

export function extractImageUrlsFromHtml(html: string, pageUrl: string): string[] {
  const rawCandidates = [
    ...collectMetaImageUrls(html),
    ...collectLinkImageUrls(html),
    ...collectJsonLdImageUrls(html),
    ...collectHighConfidenceImgUrls(html),
    ...collectBackgroundImageUrls(html),
  ]

  const resolved = rawCandidates
    .map((candidate) => {
      try {
        return new URL(candidate, pageUrl).toString()
      } catch {
        return null
      }
    })
    .map((candidate) => normalizeRemoteImageUrl(candidate))
    .filter((candidate): candidate is string => Boolean(candidate))

  return Array.from(new Set(resolved))
}

export async function extractBestImageUrlFromPage(
  pageUrl: string | null | undefined,
  options: ExtractImageOptions = {},
): Promise<string | null> {
  const normalizedPageUrl = cleanString(pageUrl)
  if (!normalizedPageUrl) return null

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

    if (!response.ok) return null

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html')) return null

    const html = await response.text()
    return extractImageUrlsFromHtml(html, normalizedPageUrl)[0] ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
