-- Migration 0002: Convert users table to user_profiles for multi-tenant support

CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"school_name" text NOT NULL,
	"director_email" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"tenant_id" uuid,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);

CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"email" text NOT NULL,
	"role" text DEFAULT 'PARENT' NOT NULL,
	"display_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications" DISABLE ROW LEVEL SECURITY;

DROP TABLE "accounts" CASCADE;
DROP TABLE "sessions" CASCADE;
DROP TABLE "users" CASCADE;
DROP TABLE "verifications" CASCADE;

-- Skip messages table modification if sequence already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'messages_id_seq') THEN
    ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;
    ALTER TABLE "messages" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);
  END IF;
END $$;

ALTER TABLE "tenants" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "tenants" ADD COLUMN "director_email" text;
ALTER TABLE "tenants" ADD COLUMN "director_name" text;
ALTER TABLE "tenants" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

-- Migration 0003: Clean up messages table
DROP TABLE "messages" CASCADE;