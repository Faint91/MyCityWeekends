'use client'

import React, { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDocumentInfo } from '@payloadcms/ui'
import type { BeforeDocumentControlsClientProps } from 'payload'
import { createDraftCandidateEventAction, publishCandidateEventAction } from './actions'

type CandidateStatus =
  | 'new'
  | 'shortlisted'
  | 'draft_created'
  | 'rejected'
  | 'duplicate'
  | 'published'

export default function CandidateEventActions(_props: BeforeDocumentControlsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id, data, isEditing } = useDocumentInfo()
  const [isPending, startTransition] = useTransition()

  const candidateId = typeof id === 'number' ? id : undefined
  const status = typeof data?.status === 'string' ? (data.status as CandidateStatus) : undefined

  if (!isEditing || candidateId === undefined) return null

  const isResolved = status === 'published' || status === 'draft_created'
  const action = searchParams.get('mcwAction')
  const message = searchParams.get('message')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginRight: 12 }}>
      {action === 'create-draft-success' && <p style={{ margin: 0 }}>Draft event created.</p>}
      {action === 'publish-success' && <p style={{ margin: 0 }}>Candidate published.</p>}
      {action === 'create-draft-error' && (
        <p style={{ margin: 0 }}>Could not create draft: {message ?? 'Unknown error.'}</p>
      )}
      {action === 'publish-error' && (
        <p style={{ margin: 0 }}>Could not publish: {message ?? 'Unknown error.'}</p>
      )}

      {!isResolved && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await createDraftCandidateEventAction(candidateId)
                router.push(result.redirectTo)
                router.refresh()
              })
            }
          >
            Create Draft Event
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await publishCandidateEventAction(candidateId)
                router.push(result.redirectTo)
                router.refresh()
              })
            }
          >
            Publish Now
          </button>
        </div>
      )}
    </div>
  )
}
