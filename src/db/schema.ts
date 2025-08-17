import { pgTable, text, uuid, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  status: text('status').notNull().default('pending'), // pending, active, inactive, reserved
  directorEmail: text('director_email'),
  directorName: text('director_name'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
})

export const connectedAccounts = pgTable('connected_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  stripeAccountId: text('stripe_account_id').notNull().unique(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
})

export const stripeSyncLog = pgTable('stripe_sync_log', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  direction: text('direction').notNull(), // 'push' | 'pull'
  subjectType: text('subject_type').notNull(),
  subjectId: text('subject_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  result: jsonb('result').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
})

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').notNull().unique(),
  schoolName: text('school_name').notNull(),
  directorEmail: text('director_email').notNull(),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at', { withTimezone: false }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
})

// Domain tables (migrated from Prisma/SQLite) - Postgres
import { integer, boolean } from 'drizzle-orm/pg-core'

export const students = pgTable('students', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  instrument: text('instrument').notNull(),
  grade: text('grade'),
  source: text('source').notNull().default('ROSTER'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const studentParents = pgTable(
  'student_parents',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    studentId: text('student_id').notNull(),
    status: text('status').notNull().default('PENDING'),
    deletedAt: timestamp('deleted_at', { withTimezone: false }),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (t) => ({
    uqUserStudent: uniqueIndex('student_parents_tenant_user_id_student_id_key').on(t.tenantId, t.userId, t.studentId),
  })
)

export const paymentCategories = pgTable(
  'payment_categories',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    fullAmount: integer('full_amount').notNull(),
    allowIncrements: boolean('allow_increments').notNull().default(false),
    incrementAmount: integer('increment_amount'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (t) => ({
    uqTenantCategoryName: uniqueIndex('payment_categories_tenant_id_name_key').on(t.tenantId, t.name),
  })
)

export const studentPaymentEnrollments = pgTable(
  'student_payment_enrollments',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull(),
    categoryId: text('category_id').notNull(),
    totalOwed: integer('total_owed').notNull(),
    amountPaid: integer('amount_paid').notNull().default(0),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  },
  (t) => ({
    uqStudentCategory: uniqueIndex('student_payment_enrollments_tenant_student_id_category_id_key').on(
      t.tenantId,
      t.studentId,
      t.categoryId,
    ),
  })
)

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  enrollmentId: text('enrollment_id').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('PENDING'),
  notes: text('notes'),
  parentEmail: text('parent_email').notNull(),
  studentName: text('student_name').notNull(),
  emailSent: boolean('email_sent').notNull().default(false),
  emailError: text('email_error'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  categoryId: text('category_id').notNull(),
})

export const guestPayments = pgTable('guest_payments', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  parentName: text('parent_name').notNull(),
  parentEmail: text('parent_email').notNull(),
  studentName: text('student_name').notNull(),
  categoryId: text('category_id').notNull(),
  amount: integer('amount').notNull(),
  notes: text('notes'),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  status: text('status').notNull().default('PENDING'),
  matchedStudentId: text('matched_student_id'),
  matchedUserId: text('matched_user_id'),
  resolutionNotes: text('resolution_notes'),
  resolvedAt: timestamp('resolved_at', { withTimezone: false }),
  emailSent: boolean('email_sent').notNull().default(false),
  emailError: text('email_error'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const stripeCache = pgTable('stripe_cache', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const donations = pgTable('donations', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  parentName: text('parent_name').notNull(),
  parentEmail: text('parent_email').notNull(),
  amount: integer('amount').notNull(),
  notes: text('notes').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  status: text('status').notNull().default('PENDING'),
  isGuest: boolean('is_guest').notNull().default(false),
  userId: text('user_id'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const messages = pgTable('messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

// Supabase Auth integration - user profiles with tenant relationships
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().default('PARENT'), // PARENT, DIRECTOR, BOOSTER
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

// Note: Supabase Auth tables (auth.users, auth.sessions, etc.) are managed automatically
// We only need our custom user_profiles table to link users to tenants

// Temporary compatibility export - use userProfiles for new code
export const users = userProfiles // Alias for backward compatibility during migration
