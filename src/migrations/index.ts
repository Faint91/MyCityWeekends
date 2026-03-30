import * as migration_20260305_040259 from './20260305_040259'
import * as migration_20260326_000001_add_event_image from './20260326_000001_add_event_image'
import * as migration_20260329_000001_add_event_description from './20260329_000001_add_event_description'
import * as migration_20260329_000002_add_events_to_header_footer_rels from './20260329_000002_add_events_to_header_footer_rels'

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
]
