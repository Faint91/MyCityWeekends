import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_candidate_events_status" ADD VALUE 'draft_created' BEFORE 'rejected';`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "candidate_events" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "candidate_events" ALTER COLUMN "status" SET DEFAULT 'new'::text;
  DROP TYPE "public"."enum_candidate_events_status";
  CREATE TYPE "public"."enum_candidate_events_status" AS ENUM('new', 'shortlisted', 'rejected', 'duplicate', 'published');
  ALTER TABLE "candidate_events" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."enum_candidate_events_status";
  ALTER TABLE "candidate_events" ALTER COLUMN "status" SET DATA TYPE "public"."enum_candidate_events_status" USING "status"::"public"."enum_candidate_events_status";`)
}
