import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events"
    ADD COLUMN IF NOT EXISTS "description" text;
  `)

  await db.execute(sql`
    ALTER TABLE "_events_v"
    ADD COLUMN IF NOT EXISTS "version_description" text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_events_v"
    DROP COLUMN IF EXISTS "version_description";
  `)

  await db.execute(sql`
    ALTER TABLE "events"
    DROP COLUMN IF EXISTS "description";
  `)
}
