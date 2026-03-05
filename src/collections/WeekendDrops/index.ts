import type { CollectionConfig } from 'payload'

export const WeekendDrops: CollectionConfig = {
  slug: 'weekend-drops',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'weekendStart', 'weekendEnd', 'updatedAt'],
  },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'city', type: 'text', defaultValue: 'Vancouver, BC' },

    { name: 'weekendStart', type: 'date', required: true },
    { name: 'weekendEnd', type: 'date', required: true },

    // For shareable URLs later like /weekend/2026-03-06
    { name: 'slug', type: 'text', index: true },
  ],
}
