import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const slugsParam = url.searchParams.get('slugs') ?? ''

  const slugs = slugsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50)

  if (slugs.length === 0) {
    return NextResponse.json({ docs: [] })
  }

  const payload = await getPayloadClient()

  const res = await payload.find({
    collection: 'events',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { or: slugs.map((slug) => ({ slug: { equals: slug } })) },
      ],
    },
    limit: slugs.length,
    depth: 3,
    overrideAccess: true,
    draft: false,
  })

  return NextResponse.json({ docs: res.docs })
}
