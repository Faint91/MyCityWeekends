import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "weekend_drop_items" ALTER COLUMN "section" SET DATA TYPE text;
  DROP TYPE "public"."enum_weekend_drop_items_section";
  CREATE TYPE "public"."enum_weekend_drop_items_section" AS ENUM('top3', 'free', 'under30');
  ALTER TABLE "weekend_drop_items" ALTER COLUMN "section" SET DATA TYPE "public"."enum_weekend_drop_items_section" USING "section"::"public"."enum_weekend_drop_items_section";
  ALTER TABLE "candidate_events" ALTER COLUMN "section_suggestion" SET DATA TYPE text;
  DROP TYPE "public"."enum_candidate_events_section_suggestion";
  CREATE TYPE "public"."enum_candidate_events_section_suggestion" AS ENUM('top3', 'free', 'under30');
  ALTER TABLE "candidate_events" ALTER COLUMN "section_suggestion" SET DATA TYPE "public"."enum_candidate_events_section_suggestion" USING "section_suggestion"::"public"."enum_candidate_events_section_suggestion";
  ALTER TABLE "ingestion_runs" ADD COLUMN "free_count" numeric DEFAULT 0;
  ALTER TABLE "ingestion_runs" ADD COLUMN "under30_count" numeric DEFAULT 0;
  ALTER TABLE "ingestion_runs" ADD COLUMN "priced_count" numeric DEFAULT 0;
  ALTER TABLE "ingestion_runs" ADD COLUMN "missing_price_count" numeric DEFAULT 0;
  ALTER TABLE "ingestion_runs" ADD COLUMN "refill_free_used" boolean DEFAULT false;
  ALTER TABLE "ingestion_runs" ADD COLUMN "refill_under30_used" boolean DEFAULT false;`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_weekend_drop_items_section" ADD VALUE 'under15' BEFORE 'under30';
  ALTER TYPE "public"."enum_candidate_events_section_suggestion" ADD VALUE 'under15' BEFORE 'under30';
  ALTER TABLE "ingestion_runs" DROP COLUMN "free_count";
  ALTER TABLE "ingestion_runs" DROP COLUMN "under30_count";
  ALTER TABLE "ingestion_runs" DROP COLUMN "priced_count";
  ALTER TABLE "ingestion_runs" DROP COLUMN "missing_price_count";
  ALTER TABLE "ingestion_runs" DROP COLUMN "refill_free_used";
  ALTER TABLE "ingestion_runs" DROP COLUMN "refill_under30_used";`)
}
