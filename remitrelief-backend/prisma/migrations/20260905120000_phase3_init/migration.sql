-- CreateSchema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('UNASSIGNED', 'DONOR', 'RECIPIENT', 'NGO', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING', 'DEACTIVATED');
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED');
CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'MANAGER', 'VERIFIER', 'MEMBER');
CREATE TYPE "LedgerSource" AS ENUM ('DEMO', 'APPLICATION', 'ON_CHAIN');
CREATE TYPE "TxStatus" AS ENUM ('PREPARED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DONOR',
    "roles" JSONB NOT NULL DEFAULT '["DONOR"]',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "roles" JSONB NOT NULL DEFAULT '["DONOR"]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_challenges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "wallet_address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "domain" TEXT,
    "network" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "wallet_address" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrgMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "goal" DECIMAL(20,7) NOT NULL,
    "raised" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "milestones_total" INTEGER NOT NULL DEFAULT 0,
    "milestones_verified" INTEGER NOT NULL DEFAULT 0,
    "escrow_address" TEXT,
    "usdc_issuer" TEXT,
    "recipient_name" TEXT,
    "image_gradient" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_wallet" TEXT,
    "created_by_user_id" TEXT,
    "organization_id" TEXT,
    "milestone_labels" JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(20,7) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "donor_wallet" TEXT NOT NULL,
    "donor_user_id" TEXT,
    "amount" DECIMAL(20,7) NOT NULL,
    "tx_hash" TEXT,
    "status" TEXT,
    "message" TEXT,
    "verified_on_chain" BOOLEAN NOT NULL DEFAULT false,
    "source" "LedgerSource" NOT NULL DEFAULT 'APPLICATION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "campaign_id" TEXT,
    "amount" DECIMAL(20,7),
    "milestone_index" INTEGER,
    "actor" TEXT,
    "tx_hash" TEXT,
    "note" TEXT,
    "proof_note" TEXT,
    "verified_on_chain" BOOLEAN NOT NULL DEFAULT false,
    "source" "LedgerSource" NOT NULL DEFAULT 'DEMO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blockchain_transactions" (
    "id" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "contract_address" TEXT,
    "operation" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'SUBMITTED',
    "campaign_id" TEXT,
    "donation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "indexed_cursors" (
    "cursor_key" TEXT NOT NULL,
    "cursor_value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "indexed_cursors_pkey" PRIMARY KEY ("cursor_key")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_revoked_at_idx" ON "sessions"("revoked_at");
CREATE UNIQUE INDEX "auth_challenges_wallet_address_nonce_key" ON "auth_challenges"("wallet_address", "nonce");
CREATE INDEX "auth_challenges_expires_at_idx" ON "auth_challenges"("expires_at");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_status_idx" ON "organizations"("status");
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX "campaigns_category_idx" ON "campaigns"("category");
CREATE INDEX "campaigns_created_by_user_id_idx" ON "campaigns"("created_by_user_id");
CREATE UNIQUE INDEX "milestones_campaign_id_index_key" ON "milestones"("campaign_id", "index");
CREATE INDEX "milestones_campaign_id_idx" ON "milestones"("campaign_id");
CREATE UNIQUE INDEX "donations_tx_hash_key" ON "donations"("tx_hash");
CREATE INDEX "donations_campaign_id_idx" ON "donations"("campaign_id");
CREATE INDEX "donations_donor_wallet_idx" ON "donations"("donor_wallet");
CREATE INDEX "donations_donor_user_id_idx" ON "donations"("donor_user_id");
CREATE INDEX "ledger_events_campaign_id_type_idx" ON "ledger_events"("campaign_id", "type");
CREATE UNIQUE INDEX "ledger_events_tx_hash_type_campaign_id_key" ON "ledger_events"("tx_hash", "type", "campaign_id");
CREATE INDEX "ledger_events_created_at_idx" ON "ledger_events"("created_at");
CREATE UNIQUE INDEX "blockchain_transactions_tx_hash_key" ON "blockchain_transactions"("tx_hash");
CREATE INDEX "blockchain_transactions_campaign_id_idx" ON "blockchain_transactions"("campaign_id");
CREATE INDEX "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- FKs
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "donations" ADD CONSTRAINT "donations_donor_user_id_fkey" FOREIGN KEY ("donor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ledger_events" ADD CONSTRAINT "ledger_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "donations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
