'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { executeIngestionAction } from './actions'
import type { DiscoverCandidateEventsResult } from '@/lib/discovery/types'

export default function ExecuteIngestionPanel() {
  const [isPending, startTransition] = useTransition()
  const [source, setSource] = useState<'mock' | 'openai_web'>('openai_web')
  const [result, setResult] = useState<DiscoverCandidateEventsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        background: 'var(--theme-elevation-0)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Execute Ingestion</h3>
          <p style={{ margin: '6px 0 0 0' }}>
            Run event discovery and send results to the Candidate Events queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Source{' '}
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as 'mock' | 'openai_web')}
              disabled={isPending}
            >
              <option value="openai_web">openai_web</option>
              <option value="mock">mock</option>
            </select>
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null)
                setResult(null)

                const response = await executeIngestionAction({
                  source,
                  city: 'Vancouver, BC',
                })

                if (!response.ok) {
                  setError(response.error)
                  return
                }

                setResult(response.result)
              })
            }
          >
            {isPending ? 'Running...' : 'Execute Ingestion'}
          </button>

          <Link
            href="/admin/collections/candidate-events"
            style={{
              display: 'inline-block',
              padding: '8px 12px',
              border: '1px solid var(--theme-elevation-200)',
              borderRadius: 6,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            Open Candidate Queue
          </Link>
        </div>

        {error ? (
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              border: '1px solid #b42318',
            }}
          >
            <strong>Ingestion failed:</strong> {error}
          </div>
        ) : null}

        {result ? (
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              border: '1px solid var(--theme-elevation-200)',
            }}
          >
            <strong>Ingestion completed.</strong>
            <div style={{ marginTop: 8 }}>
              <div>Source: {result.source}</div>
              <div>City: {result.city}</div>
              <div>Run ID: {result.runId}</div>
              <div>Found: {result.found}</div>
              <div>Inserted: {result.inserted}</div>
              <div>Duplicates: {result.duplicates}</div>
              <div>Free: {result.qualitySummary.freeCount}</div>
              <div>Under $30: {result.qualitySummary.under30Count}</div>
              <div>Known price: {result.qualitySummary.pricedCount}</div>
              <div>Missing price: {result.qualitySummary.missingPriceCount}</div>
              <div>Free refill used: {result.qualitySummary.refillFreeUsed ? 'Yes' : 'No'}</div>
              <div>
                Under $30 refill used: {result.qualitySummary.refillUnder30Used ? 'Yes' : 'No'}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Link
                href="/admin/collections/candidate-events"
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  border: '1px solid var(--theme-elevation-200)',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                Review Candidate Events
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
