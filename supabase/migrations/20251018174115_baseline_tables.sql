-- CreateTable
CREATE TABLE "public"."connected_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "stripe_account_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."donations" (
    "id" TEXT NOT NULL,
    "parent_name" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guest_payments" (
    "id" TEXT NOT NULL,
    "parent_name" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "notes" TEXT,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "matched_student_id" TEXT,
    "matched_user_id" TEXT,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMP(6),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_error" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "guest_payments_pkey" PRIMARY KEY ("id")
);

-- Invite Codes Migration
-- This migration creates the invite_codes table and related constraints

-- CreateTable: invite_codes
CREATE TABLE "public"."invite_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMPTZ(6),
    "user_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "public"."memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "full_amount" INTEGER NOT NULL,
    "allow_increments" BOOLEAN NOT NULL DEFAULT false,
    "increment_amount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "payment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "parent_email" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_error" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stripe_cache" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stripe_sync_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_parents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "student_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_payment_enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "total_owed" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "student_payment_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "grade" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ROSTER',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "director_email" TEXT,
    "director_name" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARENT',
    "display_name" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."waitlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "email_sent" BOOLEAN DEFAULT false,
    "source" VARCHAR(100) DEFAULT 'landing_page',
    "user_agent" TEXT,
    "ip_address" INET,
    "referrer" TEXT,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_stripe_account_id_unique" ON "public"."connected_accounts"("stripe_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "donations_stripe_payment_intent_id_unique" ON "public"."donations"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_payments_stripe_payment_intent_id_unique" ON "public"."guest_payments"("stripe_payment_intent_id");

-- CreateIndex: Unique index for invite codes
CREATE UNIQUE INDEX "invite_codes_code_unique" ON "public"."invite_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_categories_tenant_id_name_key" ON "public"."payment_categories"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_unique" ON "public"."payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_cache_user_id_unique" ON "public"."stripe_cache"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_parents_tenant_user_id_student_id_key" ON "public"."student_parents"("tenant_id", "user_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_payment_enrollments_tenant_student_id_category_id_key" ON "public"."student_payment_enrollments"("tenant_id", "student_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_unique" ON "public"."tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_key" ON "public"."waitlist"("email");

-- CreateIndex
CREATE INDEX "idx_waitlist_created_at" ON "public"."waitlist"("created_at");

-- CreateIndex
CREATE INDEX "idx_waitlist_email" ON "public"."waitlist"("email");

-- AddForeignKey
ALTER TABLE "public"."connected_accounts" ADD CONSTRAINT "connected_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."donations" ADD CONSTRAINT "donations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."guest_payments" ADD CONSTRAINT "guest_payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payment_categories" ADD CONSTRAINT "payment_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."stripe_sync_log" ADD CONSTRAINT "stripe_sync_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."student_parents" ADD CONSTRAINT "student_parents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."student_payment_enrollments" ADD CONSTRAINT "student_payment_enrollments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

