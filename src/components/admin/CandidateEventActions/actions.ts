'use server'

import { createDraftEventFromCandidate, publishCandidateEvent } from '@/lib/candidateEvents'

function candidateAdminPath(id: number) {
  return `/admin/collections/candidate-events/${id}`
}

export async function createDraftCandidateEventAction(candidateId: number) {
  try {
    await createDraftEventFromCandidate(candidateId)

    return {
      ok: true,
      redirectTo: `${candidateAdminPath(candidateId)}?mcwAction=create-draft-success`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error creating draft event.'

    return {
      ok: false,
      redirectTo: `${candidateAdminPath(candidateId)}?mcwAction=create-draft-error&message=${encodeURIComponent(message)}`,
    }
  }
}

export async function publishCandidateEventAction(candidateId: number) {
  try {
    await publishCandidateEvent({
      candidateId,
      attachToWeekendDrop: true,
    })

    return {
      ok: true,
      redirectTo: `${candidateAdminPath(candidateId)}?mcwAction=publish-success`,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error publishing candidate event.'

    return {
      ok: false,
      redirectTo: `${candidateAdminPath(candidateId)}?mcwAction=publish-error&message=${encodeURIComponent(message)}`,
    }
  }
}
