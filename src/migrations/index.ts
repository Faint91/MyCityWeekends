import * as migration_20260305_040259 from './20260305_040259'
import * as migration_20260326_000001_add_event_image from './20260326_000001_add_event_image'

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
]
