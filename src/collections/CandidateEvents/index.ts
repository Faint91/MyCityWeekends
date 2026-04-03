import type { CollectionConfig } from 'payload'

const indoorOutdoorOptions = [
  { label: 'Indoor', value: 'indoor' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Both', value: 'both' },
  { label: 'Unknown', value: 'unknown' },
]

const sectionSuggestionOptions = [
  { label: 'Top 3', value: 'top3' },
  { label: 'Free', value: 'free' },
  { label: 'Under $15', value: 'under15' },
  { label: 'Under $30', value: 'under30' },
]

const statusOptions = [
  { label: 'New', value: 'new' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Draft Created', value: 'draft_created' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Published', value: 'published' },
]

export const CandidateEvents: CollectionConfig = {
  slug: 'candidate-events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'status',
      'startAt',
      'sectionSuggestion',
      'sourceName',
      'confidenceScore',
      'updatedAt',
    ],
    description: 'Internal review queue for AI-discovered event candidates.',
    baseListFilter: () => {
      return {
        status: {
          in: ['new', 'shortlisted'],
        },
      }
    },
    components: {
      edit: {
        beforeDocumentControls: ['@/components/admin/CandidateEventActions'],
      },
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
      defaultValue: 'Vancouver, BC',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'startAt',
      type: 'date',
    },
    {
      name: 'endAt',
      type: 'date',
    },

    {
      name: 'isFree',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'priceMin',
      type: 'number',
      min: 0,
      admin: {
        condition: (_, siblingData) => !siblingData?.isFree,
      },
    },
    {
      name: 'priceMax',
      type: 'number',
      min: 0,
      admin: {
        condition: (_, siblingData) => !siblingData?.isFree,
      },
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'CAD',
      options: ['CAD', 'USD'],
      admin: {
        condition: (_, siblingData) => !siblingData?.isFree,
      },
    },

    {
      name: 'venueName',
      type: 'text',
    },
    {
      name: 'venueAddress',
      type: 'text',
    },
    {
      name: 'venueWebsite',
      type: 'text',
    },
    {
      name: 'googleMapsUrl',
      type: 'text',
    },
    {
      name: 'neighborhood',
      type: 'text',
    },

    {
      name: 'indoorOutdoor',
      type: 'select',
      defaultValue: 'unknown',
      options: indoorOutdoorOptions,
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'sourceName',
      type: 'text',
    },
    {
      name: 'sourceUrl',
      type: 'text',
      index: true,
    },
    {
      name: 'ticketUrl',
      type: 'text',
    },
    {
      name: 'imageSourceUrl',
      type: 'text',
    },

    {
      name: 'whyWorthItDraft',
      type: 'textarea',
    },
    {
      name: 'sectionSuggestion',
      type: 'select',
      options: sectionSuggestionOptions,
    },
    {
      name: 'rankSuggestion',
      type: 'number',
      min: 1,
      max: 50,
    },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: statusOptions,
      index: true,
    },
    {
      name: 'discoveredAt',
      type: 'date',
    },
    {
      name: 'ingestionRun',
      type: 'relationship',
      relationTo: 'ingestion-runs',
    },
    {
      name: 'confidenceScore',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: '0-100 confidence score from the ingestion pipeline.',
      },
    },
    {
      name: 'duplicateFingerprint',
      type: 'text',
      index: true,
    },
    {
      name: 'possibleDuplicateEvent',
      type: 'relationship',
      relationTo: 'events',
    },

    {
      name: 'adminNotes',
      type: 'textarea',
    },
    {
      name: 'publishedEvent',
      type: 'relationship',
      relationTo: 'events',
    },
    {
      name: 'publishedWeekendDropItem',
      type: 'relationship',
      relationTo: 'weekend-drop-items',
    },
  ],
}
