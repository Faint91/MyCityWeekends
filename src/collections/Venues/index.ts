import type { CollectionConfig } from 'payload'

export const Venues: CollectionConfig = {
  slug: 'venues',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'neighborhood', 'updatedAt'],
  },
  fields: [
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'neighborhood', type: 'text' },
    { name: 'address', type: 'text' },
    { name: 'website', type: 'text' },
    { name: 'googleMapsUrl', type: 'text' },
  ],
}
