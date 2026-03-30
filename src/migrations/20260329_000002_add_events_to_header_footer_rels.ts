import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "header_rels"
    ADD COLUMN IF NOT EXISTS "events_id" integer;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "header_rels_events_idx"
    ON "header_rels" ("events_id");
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'header_rels_events_fk'
      ) THEN
        ALTER TABLE "header_rels"
        ADD CONSTRAINT "header_rels_events_fk"
        FOREIGN KEY ("events_id")
        REFERENCES "public"."events"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)

  await db.execute(sql`
    ALTER TABLE "footer_rels"
    ADD COLUMN IF NOT EXISTS "events_id" integer;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "footer_rels_events_idx"
    ON "footer_rels" ("events_id");
  `)

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'footer_rels_events_fk'
      ) THEN
        ALTER TABLE "footer_rels"
        ADD CONSTRAINT "footer_rels_events_fk"
        FOREIGN KEY ("events_id")
        REFERENCES "public"."events"("id")
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "footer_rels"
    DROP CONSTRAINT IF EXISTS "footer_rels_events_fk";
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "footer_rels_events_idx";
  `)

  await db.execute(sql`
    ALTER TABLE "footer_rels"
    DROP COLUMN IF EXISTS "events_id";
  `)

  await db.execute(sql`
    ALTER TABLE "header_rels"
    DROP CONSTRAINT IF EXISTS "header_rels_events_fk";
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "header_rels_events_idx";
  `)

  await db.execute(sql`
    ALTER TABLE "header_rels"
    DROP COLUMN IF EXISTS "events_id";
  `)
}
