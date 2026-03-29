import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events"
    ADD COLUMN IF NOT EXISTS "image_id" integer;
  `)

  await db.execute(sql`
    ALTER TABLE "_events_v"
    ADD COLUMN IF NOT EXISTS "version_image_id" integer;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "events_image_idx" ON "events" ("image_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "_events_v_version_version_image_idx" ON "_events_v" ("version_image_id");
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'events_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "events"
        ADD CONSTRAINT "events_image_id_media_id_fk"
        FOREIGN KEY ("image_id")
        REFERENCES "public"."media"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = '_events_v_version_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "_events_v"
        ADD CONSTRAINT "_events_v_version_image_id_media_id_fk"
        FOREIGN KEY ("version_image_id")
        REFERENCES "public"."media"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_events_v"
    DROP CONSTRAINT IF EXISTS "_events_v_version_image_id_media_id_fk";
  `)

  await db.execute(sql`
    ALTER TABLE "events"
    DROP CONSTRAINT IF EXISTS "events_image_id_media_id_fk";
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "_events_v_version_version_image_idx";
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "events_image_idx";
  `)

  await db.execute(sql`
    ALTER TABLE "_events_v"
    DROP COLUMN IF EXISTS "version_image_id";
  `)

  await db.execute(sql`
    ALTER TABLE "events"
    DROP COLUMN IF EXISTS "image_id";
  `)
}
