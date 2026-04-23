import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'

loadEnv({ path: path.resolve(process.cwd(), '.env') })
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true })

if (!process.env.PAYLOAD_SECRET) {
  throw new Error(
    'Missing PAYLOAD_SECRET. Make sure your .env or .env.local is present before running backfill:under30.',
  )
}

let payloadPromise: ReturnType<typeof getPayload> | null = null

async function getConfiguredPayload() {
  if (!payloadPromise) {
    payloadPromise = import('@payload-config').then(({ default: configPromise }) =>
      getPayload({ config: configPromise }),
    )
  }

  return payloadPromise
}

type WeekendDropDoc = {
  id: number | string
  title?: string | null
  weekendStart?: string | null
  _status?: 'draft' | 'published'
}

type WeekendDropItemDoc = {
  id: number | string
  section?: 'top3' | 'free' | 'under15' | 'under30' | null
}

type CandidateEventDoc = {
  id: number | string
  title?: string | null
  status?: string | null
  sectionSuggestion?: 'top3' | 'free' | 'under15' | 'under30' | null
}

async function getLatestWeekendDropByStatus(status: 'draft' | 'published') {
  const payload = await getConfiguredPayload()

  const result = await payload.find({
    collection: 'weekend-drops',
    overrideAccess: true,
    draft: status === 'draft',
    where: {
      _status: { equals: status },
    },
    sort: '-weekendStart',
    limit: 1,
    depth: 0,
  })

  return (result.docs[0] as WeekendDropDoc | undefined) ?? null
}

async function backfillWeekendDropItems(weekendDropId: number | string) {
  const payload = await getConfiguredPayload()

  const result = await payload.find({
    collection: 'weekend-drop-items',
    overrideAccess: true,
    draft: true,
    where: {
      and: [{ weekendDrop: { equals: weekendDropId } }, { section: { equals: 'under15' } }],
    },
    sort: 'rank',
    limit: 100,
    depth: 0,
  })

  const items = result.docs as WeekendDropItemDoc[]
  let updatedCount = 0

  for (const item of items) {
    await payload.update({
      collection: 'weekend-drop-items',
      id: item.id,
      overrideAccess: true,
      data: {
        section: 'under30',
      },
    })

    updatedCount += 1
  }

  return updatedCount
}

async function backfillCandidateEvents() {
  const payload = await getConfiguredPayload()

  const result = await payload.find({
    collection: 'candidate-events',
    overrideAccess: true,
    draft: true,
    where: {
      sectionSuggestion: { equals: 'under15' },
    },
    sort: '-updatedAt',
    limit: 200,
    depth: 0,
  })

  const candidates = result.docs as CandidateEventDoc[]
  let updatedCount = 0

  for (const candidate of candidates) {
    if (candidate.status === 'published') continue

    await payload.update({
      collection: 'candidate-events',
      id: candidate.id,
      overrideAccess: true,
      data: {
        sectionSuggestion: 'under30',
      },
    })

    updatedCount += 1
  }

  return updatedCount
}

async function run() {
  const latestPublished = await getLatestWeekendDropByStatus('published')
  const latestDraft = await getLatestWeekendDropByStatus('draft')

  const dropIds = Array.from(
    new Set(
      [latestPublished?.id, latestDraft?.id].filter((value): value is number | string => !!value),
    ),
  )

  console.log('[backfill] Starting under15 -> under30 backfill')
  console.log('[backfill] Latest published drop:', latestPublished)
  console.log('[backfill] Latest draft drop:', latestDraft)

  let updatedWeekendDropItems = 0

  for (const dropId of dropIds) {
    const count = await backfillWeekendDropItems(dropId)
    updatedWeekendDropItems += count
    console.log(`[backfill] Updated ${count} weekend_drop_items for weekendDrop ${dropId}`)
  }

  const updatedCandidateEvents = await backfillCandidateEvents()

  console.log('[backfill] Done')
  console.log(
    JSON.stringify(
      {
        updatedWeekendDropItems,
        updatedCandidateEvents,
      },
      null,
      2,
    ),
  )
}

run().catch((error) => {
  console.error('[backfill] Failed:', error)
  process.exit(1)
})
