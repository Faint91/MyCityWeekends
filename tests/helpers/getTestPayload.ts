import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

let payloadPromise: ReturnType<typeof getPayload> | null = null

export function getTestPayload() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config })
  }
  return payloadPromise
}
