import { describe, expect, it, vi } from 'vitest'

vi.mock('../discoverCandidateEvents', () => ({
  discoverCandidateEvents: vi.fn(),
}))

import { dryRunKickoffDiscoveryIngestion } from '../dryRunKickoffDiscoveryIngestion'

describe('dryRunKickoffDiscoveryIngestion', () => {
  it('persists kickoff, builds queue messages, and calls publisher', async () => {
    const createIngestionRun = vi.fn().mockResolvedValue({
      id: 88,
      status: 'running',
    })

    const publisher = {
      publish: vi.fn().mockResolvedValue({
        attempted: 3,
        published: 3,
        messages: [
          {
            messageId: 'msg_free',
            message: {
              type: 'ingestion.section.job',
              version: 1,
              job: {
                runId: 'run_123',
                ingestionRunId: 88,
                section: 'free',
                city: 'Vancouver, BC',
                source: 'mock',
              },
            },
          },
          {
            messageId: 'msg_under30',
            message: {
              type: 'ingestion.section.job',
              version: 1,
              job: {
                runId: 'run_123',
                ingestionRunId: 88,
                section: 'under30',
                city: 'Vancouver, BC',
                source: 'mock',
              },
            },
          },
          {
            messageId: 'msg_top3',
            message: {
              type: 'ingestion.section.job',
              version: 1,
              job: {
                runId: 'run_123',
                ingestionRunId: 88,
                section: 'top3',
                city: 'Vancouver, BC',
                source: 'mock',
              },
            },
          },
        ],
      }),
    }

    const result = await dryRunKickoffDiscoveryIngestion(
      {
        trigger: 'api',
        sections: ['free', 'under30', 'top3'],
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        createRunId: () => 'run_123',
        now: () => '2026-05-01T09:00:00.000Z',
        createIngestionRun,
        publisher,
      },
    )

    expect(createIngestionRun).toHaveBeenCalledTimes(1)

    expect(publisher.publish).toHaveBeenCalledTimes(1)
    expect(publisher.publish).toHaveBeenCalledWith([
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'free',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'under30',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_123',
          ingestionRunId: 88,
          section: 'top3',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
    ])

    expect(result.persistedRun).toEqual({
      id: 88,
      status: 'running',
    })

    expect(result.publishResult).toEqual({
      attempted: 3,
      published: 3,
      messages: [
        {
          messageId: 'msg_free',
          message: {
            type: 'ingestion.section.job',
            version: 1,
            job: {
              runId: 'run_123',
              ingestionRunId: 88,
              section: 'free',
              city: 'Vancouver, BC',
              source: 'mock',
            },
          },
        },
        {
          messageId: 'msg_under30',
          message: {
            type: 'ingestion.section.job',
            version: 1,
            job: {
              runId: 'run_123',
              ingestionRunId: 88,
              section: 'under30',
              city: 'Vancouver, BC',
              source: 'mock',
            },
          },
        },
        {
          messageId: 'msg_top3',
          message: {
            type: 'ingestion.section.job',
            version: 1,
            job: {
              runId: 'run_123',
              ingestionRunId: 88,
              section: 'top3',
              city: 'Vancouver, BC',
              source: 'mock',
            },
          },
        },
      ],
    })

    expect(result.queueMessages).toHaveLength(3)
  })

  it('uses noop publisher when no publisher is provided', async () => {
    const createIngestionRun = vi.fn().mockResolvedValue({
      id: 89,
      status: 'running',
    })

    const result = await dryRunKickoffDiscoveryIngestion(
      {
        trigger: 'api',
        sections: ['free'],
        city: 'Vancouver, BC',
        source: 'mock',
      },
      {
        createRunId: () => 'run_456',
        now: () => '2026-05-01T09:00:00.000Z',
        createIngestionRun,
      },
    )

    expect(result.queueMessages).toEqual([
      {
        type: 'ingestion.section.job',
        version: 1,
        job: {
          runId: 'run_456',
          ingestionRunId: 89,
          section: 'free',
          city: 'Vancouver, BC',
          source: 'mock',
        },
      },
    ])

    expect(result.publishResult).toEqual({
      attempted: 1,
      published: 0,
      messages: [],
    })
  })
})
