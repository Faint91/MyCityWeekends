import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_candidate_events_currency" AS ENUM('CAD', 'USD');
    CREATE TYPE "public"."enum_candidate_events_indoor_outdoor" AS ENUM('indoor', 'outdoor', 'both', 'unknown');
    CREATE TYPE "public"."enum_candidate_events_section_suggestion" AS ENUM('top3', 'free', 'under15', 'under30');
    CREATE TYPE "public"."enum_candidate_events_status" AS ENUM('new', 'shortlisted', 'rejected', 'duplicate', 'published');
    CREATE TYPE "public"."enum_ingestion_runs_status" AS ENUM('running', 'succeeded', 'failed', 'partial');

    CREATE TABLE "candidate_events_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar NOT NULL
    );

    CREATE TABLE "candidate_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "city" varchar DEFAULT 'Vancouver, BC' NOT NULL,
      "description" varchar,
      "start_at" timestamp(3) with time zone,
      "end_at" timestamp(3) with time zone,
      "is_free" boolean DEFAULT false,
      "price_min" numeric,
      "price_max" numeric,
      "currency" "enum_candidate_events_currency" DEFAULT 'CAD',
      "venue_name" varchar,
      "venue_address" varchar,
      "venue_website" varchar,
      "google_maps_url" varchar,
      "neighborhood" varchar,
      "indoor_outdoor" "enum_candidate_events_indoor_outdoor" DEFAULT 'unknown',
      "source_name" varchar,
      "source_url" varchar,
      "ticket_url" varchar,
      "image_source_url" varchar,
      "why_worth_it_draft" varchar,
      "section_suggestion" "enum_candidate_events_section_suggestion",
      "rank_suggestion" numeric,
      "status" "enum_candidate_events_status" DEFAULT 'new' NOT NULL,
      "discovered_at" timestamp(3) with time zone,
      "ingestion_run_id" integer,
      "confidence_score" numeric,
      "duplicate_fingerprint" varchar,
      "possible_duplicate_event_id" integer,
      "admin_notes" varchar,
      "published_event_id" integer,
      "published_weekend_drop_item_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "ingestion_runs" (
      "id" serial PRIMARY KEY NOT NULL,
      "status" "enum_ingestion_runs_status" DEFAULT 'running' NOT NULL,
      "city" varchar DEFAULT 'Vancouver, BC' NOT NULL,
      "started_at" timestamp(3) with time zone,
      "finished_at" timestamp(3) with time zone,
      "weekend_start" timestamp(3) with time zone,
      "weekend_end" timestamp(3) with time zone,
      "prompt_version" varchar,
      "model" varchar,
      "raw_query_summary" varchar,
      "candidate_count" numeric DEFAULT 0,
      "inserted_count" numeric DEFAULT 0,
      "duplicate_count" numeric DEFAULT 0,
      "error_summary" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "candidate_events_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ingestion_runs_id" integer;

    ALTER TABLE "candidate_events_tags"
      ADD CONSTRAINT "candidate_events_tags_parent_id_fk"
      FOREIGN KEY ("_parent_id")
      REFERENCES "public"."candidate_events"("id")
      ON DELETE cascade
      ON UPDATE no action;

    ALTER TABLE "candidate_events"
      ADD CONSTRAINT "candidate_events_ingestion_run_id_ingestion_runs_id_fk"
      FOREIGN KEY ("ingestion_run_id")
      REFERENCES "public"."ingestion_runs"("id")
      ON DELETE set null
      ON UPDATE no action;

    ALTER TABLE "candidate_events"
      ADD CONSTRAINT "candidate_events_possible_duplicate_event_id_events_id_fk"
      FOREIGN KEY ("possible_duplicate_event_id")
      REFERENCES "public"."events"("id")
      ON DELETE set null
      ON UPDATE no action;

    ALTER TABLE "candidate_events"
      ADD CONSTRAINT "candidate_events_published_event_id_events_id_fk"
      FOREIGN KEY ("published_event_id")
      REFERENCES "public"."events"("id")
      ON DELETE set null
      ON UPDATE no action;

    ALTER TABLE "candidate_events"
      ADD CONSTRAINT "candidate_events_published_weekend_drop_item_id_weekend_drop_items_id_fk"
      FOREIGN KEY ("published_weekend_drop_item_id")
      REFERENCES "public"."weekend_drop_items"("id")
      ON DELETE set null
      ON UPDATE no action;

    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_candidate_events_fk"
      FOREIGN KEY ("candidate_events_id")
      REFERENCES "public"."candidate_events"("id")
      ON DELETE cascade
      ON UPDATE no action;

    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_ingestion_runs_fk"
      FOREIGN KEY ("ingestion_runs_id")
      REFERENCES "public"."ingestion_runs"("id")
      ON DELETE cascade
      ON UPDATE no action;

    CREATE INDEX "candidate_events_tags_order_idx" ON "candidate_events_tags" USING btree ("_order");
    CREATE INDEX "candidate_events_tags_parent_id_idx" ON "candidate_events_tags" USING btree ("_parent_id");

    CREATE INDEX "candidate_events_title_idx" ON "candidate_events" USING btree ("title");
    CREATE INDEX "candidate_events_source_url_idx" ON "candidate_events" USING btree ("source_url");
    CREATE INDEX "candidate_events_status_idx" ON "candidate_events" USING btree ("status");
    CREATE INDEX "candidate_events_ingestion_run_idx" ON "candidate_events" USING btree ("ingestion_run_id");
    CREATE INDEX "candidate_events_duplicate_fingerprint_idx" ON "candidate_events" USING btree ("duplicate_fingerprint");
    CREATE INDEX "candidate_events_possible_duplicate_event_idx" ON "candidate_events" USING btree ("possible_duplicate_event_id");
    CREATE INDEX "candidate_events_published_event_idx" ON "candidate_events" USING btree ("published_event_id");
    CREATE INDEX "candidate_events_published_weekend_drop_item_idx" ON "candidate_events" USING btree ("published_weekend_drop_item_id");
    CREATE INDEX "candidate_events_updated_at_idx" ON "candidate_events" USING btree ("updated_at");
    CREATE INDEX "candidate_events_created_at_idx" ON "candidate_events" USING btree ("created_at");

    CREATE INDEX "ingestion_runs_status_idx" ON "ingestion_runs" USING btree ("status");
    CREATE INDEX "ingestion_runs_updated_at_idx" ON "ingestion_runs" USING btree ("updated_at");
    CREATE INDEX "ingestion_runs_created_at_idx" ON "ingestion_runs" USING btree ("created_at");

    CREATE INDEX "payload_locked_documents_rels_candidate_events_id_idx"
      ON "payload_locked_documents_rels" USING btree ("candidate_events_id");
    CREATE INDEX "payload_locked_documents_rels_ingestion_runs_id_idx"
      ON "payload_locked_documents_rels" USING btree ("ingestion_runs_id");
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT "payload_locked_documents_rels_candidate_events_fk";

    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT "payload_locked_documents_rels_ingestion_runs_fk";

    ALTER TABLE "candidate_events_tags"
      DROP CONSTRAINT "candidate_events_tags_parent_id_fk";

    ALTER TABLE "candidate_events"
      DROP CONSTRAINT "candidate_events_ingestion_run_id_ingestion_runs_id_fk";

    ALTER TABLE "candidate_events"
      DROP CONSTRAINT "candidate_events_possible_duplicate_event_id_events_id_fk";

    ALTER TABLE "candidate_events"
      DROP CONSTRAINT "candidate_events_published_event_id_events_id_fk";

    ALTER TABLE "candidate_events"
      DROP CONSTRAINT "candidate_events_published_weekend_drop_item_id_weekend_drop_items_id_fk";

    DROP INDEX "candidate_events_tags_order_idx";
    DROP INDEX "candidate_events_tags_parent_id_idx";

    DROP INDEX "candidate_events_title_idx";
    DROP INDEX "candidate_events_source_url_idx";
    DROP INDEX "candidate_events_status_idx";
    DROP INDEX "candidate_events_ingestion_run_idx";
    DROP INDEX "candidate_events_duplicate_fingerprint_idx";
    DROP INDEX "candidate_events_possible_duplicate_event_idx";
    DROP INDEX "candidate_events_published_event_idx";
    DROP INDEX "candidate_events_published_weekend_drop_item_idx";
    DROP INDEX "candidate_events_updated_at_idx";
    DROP INDEX "candidate_events_created_at_idx";

    DROP INDEX "ingestion_runs_status_idx";
    DROP INDEX "ingestion_runs_updated_at_idx";
    DROP INDEX "ingestion_runs_created_at_idx";

    DROP INDEX "payload_locked_documents_rels_candidate_events_id_idx";
    DROP INDEX "payload_locked_documents_rels_ingestion_runs_id_idx";

    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "candidate_events_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ingestion_runs_id";

    DROP TABLE "candidate_events_tags";
    DROP TABLE "candidate_events";
    DROP TABLE "ingestion_runs";

    DROP TYPE "public"."enum_candidate_events_currency";
    DROP TYPE "public"."enum_candidate_events_indoor_outdoor";
    DROP TYPE "public"."enum_candidate_events_section_suggestion";
    DROP TYPE "public"."enum_candidate_events_status";
    DROP TYPE "public"."enum_ingestion_runs_status";
  `)
}
