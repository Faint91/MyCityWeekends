import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startAt', 'isFree', 'priceMin', 'updatedAt'],
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true, index: true },

    // For future SEO-friendly event pages
    { name: 'slug', type: 'text', index: true },

    { name: 'startAt', type: 'date', required: true },
    { name: 'endAt', type: 'date' },

    { name: 'isFree', type: 'checkbox', defaultValue: false },

    {
      name: 'priceMin',
      type: 'number',
      min: 0,
      admin: { condition: (_, siblingData) => !siblingData?.isFree },
    },
    {
      name: 'priceMax',
      type: 'number',
      min: 0,
      admin: { condition: (_, siblingData) => !siblingData?.isFree },
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'CAD',
      options: ['CAD', 'USD'],
      admin: { condition: (_, siblingData) => !siblingData?.isFree },
    },

    {
      name: 'venue',
      type: 'relationship',
      relationTo: 'venues',
    },

    { name: 'neighborhood', type: 'text' },

    {
      name: 'indoorOutdoor',
      type: 'select',
      defaultValue: 'unknown',
      options: [
        { label: 'Indoor', value: 'indoor' },
        { label: 'Outdoor', value: 'outdoor' },
        { label: 'Both', value: 'both' },
        { label: 'Unknown', value: 'unknown' },
      ],
    },

    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      options: [
        'music',
        'comedy',
        'sports',
        'outdoors',
        'community',
        'art',
        'food',
        'market',
        'education',
        'nightlife',
      ],
    },

    // Where you found it + where users go to act
    { name: 'sourceUrl', type: 'text' },
    { name: 'ticketUrl', type: 'text' },
  ],
}
