import type { CollectionConfig } from 'payload'

const normalizeLegacyBudgetSection = <T>(value: T): T | 'under30' => {
  return value === 'under15' ? 'under30' : value
}

export const WeekendDropItems: CollectionConfig = {
  slug: 'weekend-drop-items',
  admin: {
    defaultColumns: ['weekendDrop', 'section', 'rank', 'event', 'updatedAt'],
  },
  fields: [
    {
      name: 'weekendDrop',
      type: 'relationship',
      relationTo: 'weekend-drops',
      required: true,
      index: true,
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'section',
      type: 'select',
      required: true,
      options: [
        { label: 'Top 3', value: 'top3' },
        { label: 'Free', value: 'free' },
        { label: 'Under $30', value: 'under30' },
      ],
      admin: {
        description: 'Budget picks are saved as Under $30.',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            return normalizeLegacyBudgetSection(value)
          },
        ],
      },
    },
    {
      name: 'rank',
      type: 'number',
      min: 1,
      max: 50,
      required: true,
    },
    {
      name: 'whyWorthIt',
      type: 'textarea',
      required: true,
    },
  ],
}
