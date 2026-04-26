import {
  buildRunDiscoveryIngestionContext,
  type RunDiscoveryIngestionInput,
} from './runDiscoveryIngestion'
import { buildIngestionJobPayloads, type IngestionJobPayload } from './ingestionJobPayload'

export type IngestionKickoffPlan = {
  trigger: 'admin' | 'api' | 'cron' | 'worker'
  runId: string | null
  sections: ('free' | 'under30' | 'top3')[]
  jobs: IngestionJobPayload[]
}

export function buildIngestionKickoffPlan(
  input: RunDiscoveryIngestionInput & { runId?: string },
): IngestionKickoffPlan {
  const context = buildRunDiscoveryIngestionContext(input)

  return {
    trigger: context.trigger,
    runId: context.runId,
    sections: context.sections,
    jobs: context.runId
      ? buildIngestionJobPayloads({
          runId: context.runId,
          sections: context.sections,
          city: input.city,
          weekendStart: input.weekendStart,
          weekendEnd: input.weekendEnd,
          source: input.source,
        })
      : [],
  }
}
