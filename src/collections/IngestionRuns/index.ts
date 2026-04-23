import type { CollectionConfig } from 'payload'

const runStatusOptions = [
  { label: 'Running', value: 'running' },
  { label: 'Succeeded', value: 'succeeded' },
  { label: 'Failed', value: 'failed' },
  { label: 'Partial', value: 'partial' },
]

export const IngestionRuns: CollectionConfig = {
  slug: 'ingestion-runs',
  admin: {
    useAsTitle: 'status',
    defaultColumns: [
      'status',
      'city',
      'weekendStart',
      'candidateCount',
      'freeCount',
      'under30Count',
      'missingPriceCount',
      'insertedCount',
      'duplicateCount',
      'updatedAt',
    ],
    description: 'Internal log of automated discovery / ingestion runs.',
  },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'running',
      options: runStatusOptions,
      index: true,
    },
    {
      name: 'city',
      type: 'text',
      required: true,
      defaultValue: 'Vancouver, BC',
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'finishedAt',
      type: 'date',
    },
    {
      name: 'weekendStart',
      type: 'date',
    },
    {
      name: 'weekendEnd',
      type: 'date',
    },
    {
      name: 'promptVersion',
      type: 'text',
    },
    {
      name: 'model',
      type: 'text',
    },
    {
      name: 'rawQuerySummary',
      type: 'textarea',
    },
    {
      name: 'candidateCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'insertedCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'duplicateCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'freeCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'under30Count',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'pricedCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'missingPriceCount',
      type: 'number',
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'refillFreeUsed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'refillUnder30Used',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'errorSummary',
      type: 'textarea',
    },
  ],
}
