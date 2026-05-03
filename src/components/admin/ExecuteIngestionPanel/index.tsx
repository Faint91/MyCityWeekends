'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  cleanupExpiredWeekendDropAction,
  executeIngestionAction,
  type CleanupExpiredWeekendDropActionResult,
  type ExecuteIngestionQueuedResult,
} from './actions'

export default function ExecuteIngestionPanel() {
  const [isPending, startTransition] = useTransition()
  const [source, setSource] = useState<'mock' | 'openai_web'>('openai_web')
  const [result, setResult] = useState<ExecuteIngestionQueuedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cleanupResult, setCleanupResult] = useState<CleanupExpiredWeekendDropActionResult | null>(
    null,
  )
  const [cleanupError, setCleanupError] = useState<string | null>(null)

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
            {isPending ? 'Queueing...' : 'Execute Ingestion'}
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
            <strong>Ingestion queued.</strong>
            <p style={{ margin: '8px 0 0 0' }}>
              Discovery is running in the background. Refresh the ingestion run after a few minutes
              to check whether it succeeded.
            </p>

            <div style={{ marginTop: 8 }}>
              <div>Source: {result.run.source}</div>
              <div>City: {result.run.city}</div>
              <div>Run ID: {result.runId}</div>
              <div>Parent ingestion run ID: {result.persistedRun.id}</div>
              <div>Initial status: {result.persistedRun.status}</div>
              <div>Requested sections: {result.plan.sections.join(', ')}</div>
              <div>
                Queued first section: {result.publishedQueueMessages[0]?.job.section ?? 'None'}
              </div>
              <div>Queue messages prepared: {result.queueMessages.length}</div>
              <div>Queue messages published now: {result.publishResult.published}</div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link
                href={`/admin/collections/ingestion-runs/${result.persistedRun.id}`}
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  border: '1px solid var(--theme-elevation-200)',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                Open Ingestion Run
              </Link>

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
        <div
          style={{
            marginTop: 8,
            paddingTop: 16,
            borderTop: '1px solid var(--theme-elevation-150)',
          }}
        >
          <h3 style={{ margin: 0 }}>Weekend Drop Cleanup</h3>
          <p style={{ margin: '6px 0 12px 0' }}>
            Delete the latest expired Weekend Drop, its Weekend Drop Items, and the Events connected
            to those items. Use this to test the Monday cleanup flow.
          </p>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              const confirmed = window.confirm(
                'Delete the latest expired Weekend Drop, its Weekend Drop Items, and connected Events? This cannot be undone.',
              )

              if (!confirmed) return

              startTransition(async () => {
                setCleanupError(null)
                setCleanupResult(null)

                const response = await cleanupExpiredWeekendDropAction()

                if (!response.ok) {
                  setCleanupError(response.error)
                  return
                }

                setCleanupResult(response.result)
              })
            }}
          >
            {isPending ? 'Working...' : 'Delete latest expired Weekend Drop'}
          </button>

          {cleanupError ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 6,
                border: '1px solid #b42318',
              }}
            >
              <strong>Cleanup failed:</strong> {cleanupError}
            </div>
          ) : null}

          {cleanupResult ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 6,
                border: '1px solid var(--theme-elevation-200)',
              }}
            >
              <strong>{cleanupResult.skipped ? 'Cleanup skipped.' : 'Cleanup completed.'}</strong>

              {cleanupResult.reason ? <p>{cleanupResult.reason}</p> : null}

              <div style={{ marginTop: 8 }}>
                <div>Weekend Drop: {cleanupResult.weekendDropTitle ?? 'None'}</div>
                <div>Weekend Drop ID: {cleanupResult.weekendDropId ?? 'None'}</div>
                <div>Deleted Weekend Drop Items: {cleanupResult.deletedWeekendDropItems}</div>
                <div>Deleted Events: {cleanupResult.deletedEvents}</div>
                <div>Cleared Candidate Events: {cleanupResult.clearedCandidateEvents}</div>
                <div>
                  Skipped Events Still Referenced:{' '}
                  {cleanupResult.skippedEventsStillReferenced.length}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
