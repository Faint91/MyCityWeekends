'use client'

import React, { useRef, useState } from 'react'
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

type PendingAction = 'draft' | 'publish' | null

export default function CandidateEventActions(_props: BeforeDocumentControlsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id, data, isEditing } = useDocumentInfo()

  const actionLockRef = useRef(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const candidateId = typeof id === 'number' ? id : undefined
  const status = typeof data?.status === 'string' ? (data.status as CandidateStatus) : undefined

  if (!isEditing || candidateId === undefined) return null

  const isResolved = status === 'published' || status === 'draft_created'
  const action = searchParams.get('mcwAction')
  const message = searchParams.get('message')

  async function runAction(kind: Exclude<PendingAction, null>) {
    if (actionLockRef.current || candidateId === undefined) return

    actionLockRef.current = true
    setPendingAction(kind)

    try {
      const safeCandidateId = candidateId

      const result =
        kind === 'draft'
          ? await createDraftCandidateEventAction(safeCandidateId)
          : await publishCandidateEventAction(safeCandidateId)

      router.replace(result.redirectTo)
      router.refresh()
    } catch (error) {
      console.error(`Candidate action failed: ${kind}`, error)
      actionLockRef.current = false
      setPendingAction(null)
    }
  }

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
            disabled={pendingAction !== null}
            onClick={() => {
              void runAction('draft')
            }}
          >
            {pendingAction === 'draft' ? 'Creating Draft…' : 'Create Draft Event'}
          </button>

          <button
            type="button"
            disabled={pendingAction !== null}
            onClick={() => {
              void runAction('publish')
            }}
          >
            {pendingAction === 'publish' ? 'Publishing…' : 'Publish Now'}
          </button>
        </div>
      )}
    </div>
  )
}
