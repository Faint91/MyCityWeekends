import * as migration_20260305_040259 from './20260305_040259'
import * as migration_20260326_000001_add_event_image from './20260326_000001_add_event_image'
import * as migration_20260329_000001_add_event_description from './20260329_000001_add_event_description'
import * as migration_20260329_000002_add_events_to_header_footer_rels from './20260329_000002_add_events_to_header_footer_rels'
import * as migration_20260331_020246_add_candidate_events_and_ingestion_runs from './20260331_020246_add_candidate_events_and_ingestion_runs'
import * as migration_20260331_190800_add_candidate_event_draft_created_status from './20260331_190800_add_candidate_event_draft_created_status'
import * as migration_20260421_211917_add_ingestion_run_quality_summary_fields from './20260421_211917_add_ingestion_run_quality_summary_fields'

export const migrations = [
  {
    up: migration_20260305_040259.up,
    down: migration_20260305_040259.down,
    name: '20260305_040259',
  },
  {
    up: migration_20260326_000001_add_event_image.up,
    down: migration_20260326_000001_add_event_image.down,
    name: '20260326_000001_add_event_image',
  },
  {
    up: migration_20260329_000001_add_event_description.up,
    down: migration_20260329_000001_add_event_description.down,
    name: '20260329_000001_add_event_description',
  },
  {
    up: migration_20260329_000002_add_events_to_header_footer_rels.up,
    down: migration_20260329_000002_add_events_to_header_footer_rels.down,
    name: '20260329_000002_add_events_to_header_footer_rels',
  },
  {
    up: migration_20260331_020246_add_candidate_events_and_ingestion_runs.up,
    down: migration_20260331_020246_add_candidate_events_and_ingestion_runs.down,
    name: '20260331_020246_add_candidate_events_and_ingestion_runs',
  },
  {
    up: migration_20260331_190800_add_candidate_event_draft_created_status.up,
    down: migration_20260331_190800_add_candidate_event_draft_created_status.down,
    name: '20260331_190800_add_candidate_event_draft_created_status',
  },
  {
    up: migration_20260421_211917_add_ingestion_run_quality_summary_fields.up,
    down: migration_20260421_211917_add_ingestion_run_quality_summary_fields.down,
    name: '20260421_211917_add_ingestion_run_quality_summary_fields',
  },
]
