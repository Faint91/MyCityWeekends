import { randomUUID } from 'node:crypto'
import { buildIngestionKickoffPlan, type IngestionKickoffPlan } from './buildIngestionKickoffPlan'
import type { RunDiscoveryIngestionInput } from './runDiscoveryIngestion'

export type PreparedIngestionKickoff = {
  runId: string
  plan: IngestionKickoffPlan
}

type PrepareIngestionKickoffOptions = {
  createRunId?: () => string
}

export function prepareIngestionKickoff(
  input: RunDiscoveryIngestionInput,
  options: PrepareIngestionKickoffOptions = {},
): PreparedIngestionKickoff {
  const createRunId = options.createRunId ?? (() => randomUUID())
  const runId = createRunId()

  return {
    runId,
    plan: buildIngestionKickoffPlan({
      ...input,
      runId,
    }),
  }
}
