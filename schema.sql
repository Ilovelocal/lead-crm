-- ============================================================================
-- Lead CRM — database schema
-- Paste this whole file into the Neon SQL Editor (Console -> SQL Editor) and
-- run it once. It creates the enum, the three tables, all indexes that Prisma
-- expects, and your single admin account (see the bottom of this file).
-- ============================================================================

-- gen_random_uuid() is in core Postgres 13+, but enable pgcrypto just in case.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Lead pipeline status (matches the Prisma `LeadStatus` enum exactly).
DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM (
    'new_lead',
    'in_conversation',
    'waiting_on_client',
    'active_subscriber',
    'inactive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- --- users -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "email"         TEXT         NOT NULL,
  "password_hash" TEXT         NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users" ("email");

-- --- leads -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "leads" (
  "id"              UUID           NOT NULL DEFAULT gen_random_uuid(),
  "business_name"   TEXT           NOT NULL,
  "contact_person"  TEXT,
  "email"           TEXT,
  "phone"           TEXT,
  "website"         TEXT,
  "status"          "LeadStatus"   NOT NULL DEFAULT 'new_lead',
  "monthly_revenue" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "notes"           TEXT,
  "created_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leads_email_key" ON "leads" ("email");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads" ("status");

-- --- interactions ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "interactions" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "lead_id"         UUID         NOT NULL,
  "summary"         TEXT         NOT NULL,
  "raw_ai_analysis" JSONB,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "interactions_lead_id_idx" ON "interactions" ("lead_id");

-- FK: deleting a lead removes its interactions (matches Prisma onDelete: Cascade).
DO $$ BEGIN
  ALTER TABLE "interactions"
    ADD CONSTRAINT "interactions_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Create your admin account.
-- crypt(... gen_salt('bf', 10)) produces a bcrypt ($2a$) hash right here in
-- Postgres — the app's bcryptjs verifies it directly. EDIT the email and
-- password below, then run. You can change both later on the Account page.
-- ============================================================================
INSERT INTO "users" ("email", "password_hash")
VALUES (
  'admin@example.com',                         -- <-- your email
  crypt('change-this-password', gen_salt('bf', 10))  -- <-- your password
)
ON CONFLICT ("email") DO NOTHING;

