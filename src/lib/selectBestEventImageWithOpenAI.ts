import OpenAI from 'openai'

import { cleanString } from './discovery/dedupe'

export type EventImageSelectionCandidate = {
  url: string
  source?: string | null
  score?: number | null
  context?: string | null
}

export type EventImageSelectionResult = {
  selectedUrl: string | null
  reason: string
  model: string | null
  candidateCount: number
}

const DEFAULT_IMAGE_SELECTION_MODEL = process.env.OPENAI_IMAGE_SELECTION_MODEL ?? 'gpt-5-mini'
const DEFAULT_IMAGE_SELECTION_TIMEOUT_MS = Number(
  process.env.OPENAI_IMAGE_SELECTION_TIMEOUT_MS ?? 20_000,
)
const MAX_IMAGE_CANDIDATES = 6

const IMAGE_SELECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    selectedUrl: {
      type: ['string', 'null'],
      description:
        'The exact URL of the best image candidate, copied from the provided candidates. Use null if none are suitable.',
    },
    reason: {
      type: 'string',
      description: 'Brief explanation for the choice.',
    },
  },
  required: ['selectedUrl', 'reason'],
} as const

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function normalizeCandidateUrl(url: string | null | undefined): string | null {
  const cleaned = cleanString(url)
  if (!cleaned) return null

  try {
    return new URL(cleaned).toString()
  } catch {
    return null
  }
}

function getUniqueCandidates(
  candidates: EventImageSelectionCandidate[],
): EventImageSelectionCandidate[] {
  const seen = new Set<string>()
  const unique: EventImageSelectionCandidate[] = []

  for (const candidate of candidates) {
    const url = normalizeCandidateUrl(candidate.url)
    if (!url || seen.has(url)) continue

    seen.add(url)
    unique.push({
      ...candidate,
      url,
      context: cleanString(candidate.context)?.slice(0, 500) ?? null,
    })
  }

  return unique.slice(0, MAX_IMAGE_CANDIDATES)
}

function parseSelectionOutput(
  value: string,
): { selectedUrl: string | null; reason: string } | null {
  try {
    const parsed = JSON.parse(value) as {
      selectedUrl?: unknown
      reason?: unknown
    }

    const selectedUrl =
      typeof parsed.selectedUrl === 'string' ? normalizeCandidateUrl(parsed.selectedUrl) : null

    return {
      selectedUrl,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided.',
    }
  } catch {
    return null
  }
}

export async function selectBestEventImageWithOpenAI(input: {
  title: string
  description?: string | null
  sourceUrl?: string | null
  candidates: EventImageSelectionCandidate[]
}): Promise<EventImageSelectionResult> {
  const client = getOpenAIClient()
  const candidates = getUniqueCandidates(input.candidates)

  if (!client) {
    return {
      selectedUrl: null,
      reason: 'OPENAI_API_KEY is missing; using deterministic image order.',
      model: null,
      candidateCount: candidates.length,
    }
  }

  if (candidates.length === 0) {
    return {
      selectedUrl: null,
      reason: 'No image candidates were available.',
      model: DEFAULT_IMAGE_SELECTION_MODEL,
      candidateCount: 0,
    }
  }

  const candidateUrls = new Set(candidates.map((candidate) => candidate.url))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_IMAGE_SELECTION_TIMEOUT_MS)

  try {
    const candidateSummary = candidates
      .map((candidate, index) => {
        return [
          `Candidate ${index + 1}`,
          `URL: ${candidate.url}`,
          `Source: ${candidate.source ?? 'unknown'}`,
          `Extractor score: ${candidate.score ?? 'unknown'}`,
          candidate.context ? `Nearby page context: ${candidate.context}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      })
      .join('\n\n')

    const response = await client.responses.create(
      {
        model: DEFAULT_IMAGE_SELECTION_MODEL,
        input: [
          {
            role: 'developer',
            content: [
              {
                type: 'input_text',
                text: [
                  'You choose the best image for a weekend event card.',
                  'Pick the image that is most relevant, visually appealing, and likely to represent the specific event.',
                  'Prefer real event photos, event posters, hero images, or artwork.',
                  'Avoid logos, icons, generic website headers, navigation graphics, empty placeholders, tiny images, and unrelated venue photos.',
                  'The selectedUrl must exactly match one of the candidate URLs. Return null if none are suitable.',
                ].join('\n'),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  `Event title: ${input.title}`,
                  input.description ? `Event description: ${input.description}` : null,
                  input.sourceUrl ? `Official page: ${input.sourceUrl}` : null,
                  '',
                  'Candidate metadata:',
                  candidateSummary,
                ]
                  .filter(Boolean)
                  .join('\n'),
              },
              ...candidates.flatMap((candidate, index) => [
                {
                  type: 'input_text' as const,
                  text: `Candidate ${index + 1}: ${candidate.url}`,
                },
                {
                  type: 'input_image' as const,
                  image_url: candidate.url,
                  detail: 'low' as const,
                },
              ]),
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'event_image_selection',
            strict: true,
            schema: IMAGE_SELECTION_SCHEMA,
          },
        },
      },
      {
        signal: controller.signal,
      },
    )

    const parsed = parseSelectionOutput(response.output_text ?? '')

    if (!parsed) {
      return {
        selectedUrl: null,
        reason: 'OpenAI returned invalid JSON; using deterministic image order.',
        model: DEFAULT_IMAGE_SELECTION_MODEL,
        candidateCount: candidates.length,
      }
    }

    if (!parsed.selectedUrl || !candidateUrls.has(parsed.selectedUrl)) {
      return {
        selectedUrl: null,
        reason: `OpenAI did not choose a valid candidate URL. Reason: ${parsed.reason}`,
        model: DEFAULT_IMAGE_SELECTION_MODEL,
        candidateCount: candidates.length,
      }
    }

    return {
      selectedUrl: parsed.selectedUrl,
      reason: parsed.reason,
      model: DEFAULT_IMAGE_SELECTION_MODEL,
      candidateCount: candidates.length,
    }
  } catch (error) {
    return {
      selectedUrl: null,
      reason:
        error instanceof Error
          ? `OpenAI image selection failed: ${error.message}`
          : 'OpenAI image selection failed for an unknown reason.',
      model: DEFAULT_IMAGE_SELECTION_MODEL,
      candidateCount: candidates.length,
    }
  } finally {
    clearTimeout(timeout)
  }
}
