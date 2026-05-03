import { NextResponse, type NextRequest } from 'next/server'

const CANONICAL_HOST = 'mycityweekends.com'

const REDIRECT_HOSTS = new Set(['my-city-weekends.vercel.app'])

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase()

  if (!host || !REDIRECT_HOSTS.has(host)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.protocol = 'https'
  url.hostname = CANONICAL_HOST
  url.port = ''

  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: [
    /*
      Run on normal app pages/API routes, but skip static assets.
      This keeps the redirect lightweight and avoids touching _next files.
    */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
