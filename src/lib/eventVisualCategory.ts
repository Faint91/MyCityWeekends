export type EventVisualCategoryInput = {
  title?: string | null
  description?: string | null
  venueName?: string | null
  neighborhood?: string | null
  tags?: readonly string[] | null
}

export const EVENT_VISUAL_CATEGORIES = {
  hockey: { label: 'Hockey', emoji: '🏒' },
  basketball: { label: 'Basketball', emoji: '🏀' },
  soccer: { label: 'Soccer', emoji: '⚽' },
  baseball: { label: 'Baseball', emoji: '⚾' },
  football: { label: 'Football', emoji: '🏈' },
  running: { label: 'Running', emoji: '🏃' },
  tennis: { label: 'Tennis', emoji: '🎾' },
  volleyball: { label: 'Volleyball', emoji: '🏐' },
  pickleball: { label: 'Pickleball', emoji: '🏓' },
  lacrosse: { label: 'Lacrosse', emoji: '🥍' },
  rugby: { label: 'Rugby', emoji: '🏉' },
  cycling: { label: 'Cycling', emoji: '🚲' },
  yoga: { label: 'Yoga', emoji: '🧘' },
  sports: { label: 'Sports', emoji: '🏟️' },

  'live-music': { label: 'Live Music', emoji: '🎸' },
  'dj-dance': { label: 'DJ / Dance', emoji: '🎧' },
  comedy: { label: 'Comedy', emoji: '🎤' },
  dance: { label: 'Dance', emoji: '💃' },
  drag: { label: 'Drag', emoji: '✨' },
  karaoke: { label: 'Karaoke', emoji: '🎙️' },

  market: { label: 'Market', emoji: '🛍️' },
  food: { label: 'Food', emoji: '🍜' },
  drinks: { label: 'Drinks', emoji: '🍹' },

  art: { label: 'Art', emoji: '🎨' },
  theatre: { label: 'Theatre', emoji: '🎭' },
  film: { label: 'Film', emoji: '🎬' },
  books: { label: 'Books', emoji: '📚' },
  anime: { label: 'Anime', emoji: '🌸' },

  outdoors: { label: 'Outdoors', emoji: '🌲' },
  education: { label: 'Learning', emoji: '💡' },
  community: { label: 'Community', emoji: '✨' },
  nightlife: { label: 'Nightlife', emoji: '🌙' },
  esports: { label: 'Esports', emoji: '🎮' },
  festival: { label: 'Festival', emoji: '🎪' },
  family: { label: 'Family', emoji: '🧡' },
  dogs: { label: 'Dogs', emoji: '🐶' },
  holiday: { label: 'Holiday', emoji: '🎄' },
  wellness: { label: 'Wellness', emoji: '🌿' },

  default: { label: 'Weekend Pick', emoji: '📍' },
} as const

export type EventVisualCategory = keyof typeof EVENT_VISUAL_CATEGORIES

export type EventVisualCategoryDefinition = (typeof EVENT_VISUAL_CATEGORIES)[EventVisualCategory]

type EventVisualCategoryRule = {
  key: EventVisualCategory
  keywords: readonly string[]
}

const EVENT_VISUAL_CATEGORY_ALIASES: Partial<Record<string, EventVisualCategory>> = {
  music: 'live-music',
  concert: 'live-music',
  gig: 'live-music',
  dj: 'dj-dance',
  clubbing: 'dj-dance',
  theatre: 'theatre',
  theater: 'theatre',
  movie: 'film',
  cinema: 'film',
  beer: 'drinks',
  brewery: 'drinks',
  wine: 'drinks',
  footballclub: 'soccer',
}

const EVENT_VISUAL_CATEGORY_RULES: readonly EventVisualCategoryRule[] = [
  { key: 'hockey', keywords: ['hockey', 'nhl', 'canucks', 'ice hockey'] },
  { key: 'basketball', keywords: ['basketball', 'nba', 'hoops', 'raptors', 'shootaround'] },
  { key: 'soccer', keywords: ['soccer', 'whitecaps', 'fifa', 'football club', 'fc'] },
  { key: 'baseball', keywords: ['baseball', 'mlb', 'vancouver canadians', 'canadians baseball'] },
  { key: 'football', keywords: ['cfl', 'bc lions', 'american football'] },
  { key: 'running', keywords: ['running', 'marathon', '5k', '10k', 'trail run', 'fun run'] },
  { key: 'tennis', keywords: ['tennis'] },
  { key: 'volleyball', keywords: ['volleyball', 'beach volleyball'] },
  { key: 'pickleball', keywords: ['pickleball'] },
  { key: 'lacrosse', keywords: ['lacrosse'] },
  { key: 'rugby', keywords: ['rugby'] },
  { key: 'cycling', keywords: ['cycling', 'bike ride', 'bicycle'] },
  { key: 'yoga', keywords: ['yoga'] },

  { key: 'dj-dance', keywords: ['dj', 'rave', 'dance party', 'dance night', 'club night'] },
  {
    key: 'live-music',
    keywords: [
      'concert',
      'live music',
      'band',
      'singer',
      'jazz',
      'classical',
      'orchestra',
      'choir',
      'gig',
      'music',
    ],
  },
  { key: 'comedy', keywords: ['comedy', 'stand up', 'standup', 'improv', 'open mic'] },
  { key: 'dance', keywords: ['dance performance', 'dance show', 'ballet', 'salsa', 'bachata'] },
  { key: 'drag', keywords: ['drag show', 'drag brunch', 'drag performance'] },
  { key: 'karaoke', keywords: ['karaoke'] },

  {
    key: 'market',
    keywords: ['market', 'bazaar', 'flea', 'craft fair', 'vendor market', 'popup market'],
  },
  {
    key: 'food',
    keywords: [
      'food',
      'tasting',
      'restaurant',
      'brunch',
      'dinner',
      'lunch',
      'ramen',
      'pizza',
      'food truck',
    ],
  },
  { key: 'drinks', keywords: ['beer', 'brewery', 'wine', 'cocktail', 'bar crawl', 'taproom'] },

  { key: 'theatre', keywords: ['theatre', 'theater', 'play', 'musical', 'stage performance'] },
  { key: 'film', keywords: ['film', 'movie', 'cinema', 'screening', 'documentary'] },
  { key: 'books', keywords: ['book launch', 'author talk', 'reading', 'poetry'] },
  { key: 'anime', keywords: ['anime', 'manga', 'cosplay'] },
  {
    key: 'art',
    keywords: ['art', 'gallery', 'museum', 'exhibit', 'exhibition', 'painting', 'ceramics'],
  },

  {
    key: 'outdoors',
    keywords: ['outdoors', 'outdoor', 'park', 'hike', 'trail', 'beach', 'garden', 'nature'],
  },
  { key: 'education', keywords: ['workshop', 'class', 'lecture', 'talk', 'learning', 'education'] },
  { key: 'nightlife', keywords: ['nightlife', 'party', 'late night', 'club'] },
  { key: 'esports', keywords: ['esports', 'gaming tournament', 'video game tournament'] },
  { key: 'festival', keywords: ['festival', 'fest'] },
  { key: 'family', keywords: ['family friendly', 'kids', 'children'] },
  { key: 'dogs', keywords: ['dog', 'dogs', 'puppy', 'pet friendly'] },
  { key: 'holiday', keywords: ['christmas', 'holiday market', 'halloween', 'new year', 'easter'] },
  { key: 'wellness', keywords: ['wellness', 'meditation', 'breathwork', 'sound bath'] },
  { key: 'community', keywords: ['community', 'neighbourhood', 'neighborhood', 'meetup'] },
  { key: 'sports', keywords: ['sports', 'game', 'match', 'tournament', 'watch party'] },
]

export function getEventVisualCategoryImagePath(key: EventVisualCategory): string {
  return `/event-defaults/${key}.webp`
}

function cleanSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugifyVisualCategory(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSearchText(input: EventVisualCategoryInput): string {
  return cleanSearchText(
    [input.title, input.description, input.venueName, input.neighborhood, ...(input.tags ?? [])]
      .filter(Boolean)
      .join(' '),
  )
}

function hasAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => {
    const cleanedKeyword = cleanSearchText(keyword)
    if (!cleanedKeyword) return false

    if (!cleanedKeyword.includes(' ')) {
      return new RegExp(`(^| )${escapeRegExp(cleanedKeyword)}( |$)`).test(text)
    }

    return text.includes(cleanedKeyword)
  })
}

export function normalizeEventVisualCategoryKey(
  value: string | null | undefined,
): EventVisualCategory | undefined {
  if (!value) return undefined

  const slug = slugifyVisualCategory(value)
  if (!slug) return undefined

  if (slug in EVENT_VISUAL_CATEGORIES) {
    return slug as EventVisualCategory
  }

  return EVENT_VISUAL_CATEGORY_ALIASES[slug]
}

export function getEventVisualCategory(input: EventVisualCategoryInput): {
  key: EventVisualCategory
  definition: EventVisualCategoryDefinition
} {
  const broadCategories = new Set<EventVisualCategory>([
    'live-music',
    'comedy',
    'sports',
    'outdoors',
    'community',
    'art',
    'food',
    'market',
    'education',
    'nightlife',
    'default',
  ])

  const normalizedTagCategories = (input.tags ?? [])
    .map((tag) => normalizeEventVisualCategoryKey(tag))
    .filter((tag): tag is EventVisualCategory => Boolean(tag))

  const granularTagCategory = normalizedTagCategories.find(
    (tagCategory) => !broadCategories.has(tagCategory),
  )

  if (granularTagCategory) {
    return {
      key: granularTagCategory,
      definition: EVENT_VISUAL_CATEGORIES[granularTagCategory],
    }
  }

  const text = buildSearchText(input)

  if (text) {
    for (const rule of EVENT_VISUAL_CATEGORY_RULES) {
      if (hasAny(text, rule.keywords)) {
        return {
          key: rule.key,
          definition: EVENT_VISUAL_CATEGORIES[rule.key],
        }
      }
    }
  }

  const broadTagCategory = normalizedTagCategories.find(
    (tagCategory) => broadCategories.has(tagCategory) && tagCategory !== 'default',
  )

  if (broadTagCategory) {
    return {
      key: broadTagCategory,
      definition: EVENT_VISUAL_CATEGORIES[broadTagCategory],
    }
  }

  return {
    key: 'default',
    definition: EVENT_VISUAL_CATEGORIES.default,
  }
}
