import { pgTable, text, uuid, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
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

// Domain tables (migrated from Prisma/SQLite) - Postgres
import { integer, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('PARENT'),
  stripeCustomerId: text('stripe_customer_id'),
  isGuestAccount: boolean('is_guest_account').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

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
  id: integer('id').primaryKey().default(sql`generated always as identity`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

// Better Auth core tables (pluralized)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: false }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: false }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: false }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
})
