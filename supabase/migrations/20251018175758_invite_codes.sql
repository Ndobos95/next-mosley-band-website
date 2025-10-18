-- Invite Codes Migration
-- This migration creates the invite_codes table and related constraints

-- Add invite_codes permissions to the app_permission enum
ALTER TYPE public.app_permission ADD VALUE 'invite_codes_create';
ALTER TYPE public.app_permission ADD VALUE 'invite_codes_read';
ALTER TYPE public.app_permission ADD VALUE 'invite_codes_update';
ALTER TYPE public.app_permission ADD VALUE 'invite_codes_delete';

-- CreateTable: invite_codes
CREATE TABLE "public"."invite_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMPTZ(6),
    "tenant_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index for invite codes
CREATE UNIQUE INDEX "invite_codes_code_unique" ON "public"."invite_codes"("code");

-- AddForeignKey: Foreign key constraint
ALTER TABLE "public"."invite_codes" ADD CONSTRAINT "invite_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Enable Row Level Security
ALTER TABLE "public"."invite_codes" ENABLE ROW LEVEL SECURITY;