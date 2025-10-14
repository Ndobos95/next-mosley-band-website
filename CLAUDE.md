# Band Program SaaS Platform - Claude Reference

## 🎯 CURRENT STATE: Multi-Tenant SaaS Platform

**Branch**: `saas-refactor` - **Status**: Ready for first customer onboarding

This platform has evolved from a single-school band program template into a **multi-tenant SaaS application** ready to onboard multiple schools as paying customers.

## Tech Stack
- **Frontend**: Next.js 15.3.4 + TypeScript + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM (migrated from SQLite)
- **Authentication**: Supabase Auth (multi-role: Parents, Directors, Boosters)
- **Payments**: Stripe Connect (per-tenant accounts) + Direct Stripe integration
- **Email**: Resend (transactional emails for payments and notifications)
- **Infrastructure**: Supabase (production) + Docker deployment

## Key Architectural Decisions

### Student-Parent Matching System
- **Privacy-first**: No student name dropdowns to prevent data leaks
- **Fuzzy matching**: Backend matches parent input against director's CSV roster
- **Real-time feedback**: "Match found!" or "Manual verification needed"
- **Director review**: Dashboard for unmatched registrations with manual linking

### Payment System Design (t3dotgg Pattern)
- **t3dotgg Architecture**: Single source of truth with `syncStripeDataToUser()` function - no complex webhook state management
- **Stripe Checkout Sessions**: Pre-created customer IDs, hosted payment pages for PCI compliance
- **Two-step flow**: Parents enroll students in categories first, then make payments in configured increments
- **Payment increments**: Band Fees ($250 full), Spring Trip ($900 in $50 increments), Equipment ($150 in $25 increments)
- **Guest checkout support**: Non-authenticated users can make payments with strict student name matching
- **Ghost accounts**: Automatic account creation for unmatched payments, convertible to real accounts
- **Notes system**: Optional notes for student payments, required notes for donations
- **General Fund**: Special student record for handling donations and arbitrary contributions

### Configuration Approach
- **File-based only**: JSON configuration for white-label customization
- **No web admin**: Director cannot change branding/settings through website
- **Developer setup**: Configuration changes require file editing and redeployment

### File Management
- **Simple model**: Director uploads, parents download
- **Category-based**: Starting with "Forms" category
- **Deprecation support**: Director can archive outdated files
- **No versioning**: Simple file replacement workflow

### Calendar Integration
- **External management**: Director maintains Google Calendar separately
- **Website display**: Embedded calendar view with subscription options
- **Public access**: Calendar viewable without login
- **No RSVP or event management**: Display and sync only

### Dashboard Architecture
- **Unified dashboard**: Single `/dashboard` URL for all authenticated users
- **Role-based content**: Different interfaces shown based on user role (parent vs director)
- **Server-side role detection**: User role determines which dashboard component renders
- **Seamless experience**: No confusion about where to go after login

## Important Workflows

### Director Workflow
1. Upload student roster (CSV: name, instrument)
2. Review unmatched parent registrations in dashboard
3. Manually link parents to students when fuzzy matching fails
4. Upload files to "Forms" category
5. Manage Google Calendar externally, configure calendar ID in system

### Parent Workflow
1. Register with student legal name and instrument
2. Get immediate feedback on student matching
3. Enroll students in payment categories (Band Fees, Spring Trip, Equipment)
4. Make payments in configured increments toward enrolled categories
5. View payment history and outstanding balances per student
6. View/download files and subscribe to calendar

### Guest Payment Workflow (Webhook-Free)
**High Confidence Match (≥0.8 fuzzy match confidence):**
1. Guest enters parent name, email, student name, and payment details
2. System performs fuzzy matching against student roster
3. **Immediately create**: Ghost account + StudentParent relationship + StudentPaymentEnrollment record
4. Create Stripe Checkout Session with ghost account customer ID
5. **Later sync** (when admin views data) links Stripe payment to existing enrollment
6. Payment appears correctly in admin dashboard with proper totals

**Low Confidence Match (<0.8 confidence):**
1. Guest enters payment details, system finds poor/no match
2. **Store in GuestPayment table only** (no ghost account yet)
3. Create Stripe Checkout Session for guest checkout
4. **Booster manual resolution**: Review unmatched payment, select correct student
5. **Resolution creates**: Ghost account + enrollment for selected student
6. **Later sync** links payment to enrollment

### Booster Review Workflow
1. **Dashboard Categorization**: Payments categorized by student matching status:
   - **Needs Review**: Payments with no matched student (regardless of payment status)
   - **Resolved**: Payments with matched student (auto-matched or manually resolved)
2. **Manual Resolution**: Review unmatched payments, select correct student from dropdown
3. **Ghost Account Creation**: Creates ghost account + enrollment for selected student  
4. **Audit Trail**: Resolution notes and timestamps for all manual interventions

## 🏗️ Multi-Tenant Database Architecture

**Migration Status**: ✅ **COMPLETED** - Fully migrated from SQLite to PostgreSQL with Prisma ORM

### **Core SaaS Infrastructure Tables**
- **`tenants`** - School organizations (slug, name, metadata)
- **`memberships`** - User-tenant relationships with roles (PARENT, DIRECTOR, BOOSTER)
- **`connectedAccounts`** - Stripe Connect accounts per tenant (for payment processing)
- **`stripeSyncLog`** - Audit trail for Stripe Connect data synchronization

### **Domain Tables (Tenant-Isolated)**
All business logic tables include `tenantId` foreign key with cascade deletes:
- **`users`** - Authentication with stripe_customer_id and isGhostAccount flag
- **`students`** - Student roster with fuzzy matching fields (per tenant)
- **`studentParents`** - Parent-student relationships with status tracking
- **`paymentCategories`** - Configurable payment types per tenant (Band Fees, Trip, Equipment)
- **`studentPaymentEnrollments`** - Tracks total_owed vs amount_paid per student/category
- **`payments`** - Individual payment records with optional notes
- **`guestPayments`** - Non-authenticated payments with resolution workflow
- **`donations`** - General Fund payments with required notes
- **`stripeCache`** - t3dotgg pattern caching for payment data
- **`messages`** - Tenant-specific communication/announcements

### **Authentication Tables (Supabase Auth)**
- **`sessions`**, **`accounts`**, **`verifications`** - Multi-tenant authentication support

## 💰 SaaS Business Model & Revenue

### **Stripe Connect Architecture**
- **Per-tenant Stripe Connect accounts**: Each school gets isolated payment processing
- **Platform fees**: 1-3% platform fee on top of Stripe's standard rates (2.9% + $0.30)
- **Direct payments**: School receives payments directly, platform takes automatic cut
- **Simplified compliance**: Schools handle their own PCI compliance through Stripe

### **Revenue Streams**
1. **Transaction fees**: 1-3% on all payments processed through the platform
2. **Monthly SaaS subscription**: $50-200/month per school (optional)
3. **Setup fees**: One-time onboarding fee for new schools
4. **Premium features**: Advanced analytics, custom branding, API access

### **Tenant Isolation & Customization**
- **Subdomain-based routing**: `schoolname.platform.com` or custom domains
- **Per-tenant configuration**: Payment categories, branding, feature toggles
- **Role-based access**: Parents see only their students, Directors manage their school
- **Data isolation**: Complete separation between schools' data

## 🚀 SaaS Development Status & Next Steps

### ✅ **COMPLETED - Production Ready Core**
1. **Multi-tenant database architecture** - PostgreSQL + Prisma with full tenant isolation
2. **Authentication system** - Supabase Auth with Parent/Director/Booster roles
3. **Payment system** - Complete t3dotgg pattern with Stripe integration (ready for Connect)
4. **Student management** - Registration, fuzzy matching, parent-student linking
5. **Email notifications** - Resend integration for payment confirmations and admin alerts
6. **Admin oversight** - Director/Booster dashboards with payment tracking and resolution

### 🔄 **IN PROGRESS - SaaS Infrastructure**
7. **Tenant context middleware** - Request-level tenant isolation (NEXT)
8. **Stripe Connect integration** - Per-tenant payment account setup
9. **Customer onboarding flow** - School signup → Stripe Connect → First admin user

### 🎯 **CRITICAL PATH TO FIRST CUSTOMER** 
**Timeline: 1-2 weeks to revenue**

**Week 1: Core Infrastructure**
- Tenant middleware for request isolation
- Stripe Connect account creation workflow  
- Database query filtering by tenant

**Week 2: Customer Onboarding**
- School signup form with Stripe Connect linking
- Director account provisioning
- Subdomain/domain routing
- Production deployment on Supabase

### 📈 **Future Enhancement Phases**
- File management system (Director uploads, Parent downloads)
- Google Calendar integration (external calendar display)
- Advanced analytics and reporting dashboard
- White-label branding and custom domains

## 🔒 Security & Compliance

### **Multi-Tenant Security**
- **Tenant isolation**: All database queries automatically filtered by tenantId
- **Role-based access**: Parents see only their students, Directors manage only their school
- **No cross-tenant data leakage**: Middleware prevents access to other schools' data
- **PII protection**: No student names in dropdowns or API responses to prevent data leaks

### **Payment Security**
- **Stripe Connect compliance**: Each school handles their own PCI compliance
- **No payment data storage**: All sensitive payment info handled by Stripe
- **Webhook-free architecture**: Eliminates webhook security vulnerabilities
- **Guest payment protection**: Fuzzy matching prevents unauthorized student access

### **Infrastructure Security**
- **PostgreSQL security**: Supabase-managed database with RLS (Row Level Security)
- **Authentication**: Supabase Auth with secure session management
- **Email security**: Resend integration with proper SPF/DKIM setup
- **Environment isolation**: Separate production/staging environments

## Current Development Status

### Phase 1: Foundation & Configuration ✅ COMPLETED
1. **✅ Initialize Next.js project** - Next.js 15.3.4 with TypeScript, Tailwind CSS, App Router
2. **✅ Configure project settings** - Updated package.json, verified tsconfig.json and next.config.ts
3. **✅ Clean up demo content** - Replaced with basic band program homepage placeholder
4. **✅ Install shadcn/ui** - Configured components and sidebar with collapsible navigation
5. **✅ Create configuration system** - Theme provider and UI components configured
6. **✅ Set up Prisma with SQLite** - Database schema design and setup completed
7. **✅ Create Docker configuration** - Containerization for deployment completed

### Project Structure Created
```
├── CLAUDE.md (this file)
├── PROJECT_PLAN.md (complete development plan)
├── package.json (updated to band-program-website)
├── next.config.ts
├── tsconfig.json
├── components.json (shadcn/ui configuration)
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx (with sidebar layout)
│   │   ├── page.tsx (Hello World)
│   │   └── dashboard/ (planned - unified dashboard)
│   │       └── page.tsx (role-based dashboard routing)
│   └── components/
│       ├── app-sidebar.tsx (collapsible sidebar with navigation)
│       ├── theme-provider.tsx
│       ├── parent-dashboard.tsx (planned - parent view)
│       ├── director-dashboard.tsx (planned - director view)
│       └── ui/ (shadcn/ui components: card, badge, table, tabs, etc.)
└── public/ (Next.js assets)
```

### Build Status
- ✅ Project builds successfully (`npm run build` passes)
- ✅ TypeScript compilation working
- ✅ Tailwind CSS configured
- ✅ Development server ready (`npm run dev`)
- ✅ Collapsible sidebar with navigation (Payments, Files, Calendar, Login)
- ✅ shadcn/ui components installed for dashboard (card, badge, table, tabs, dialog, form, etc.)

### Dashboard Component Requirements

**Parent Dashboard Components:**
- `Card` - Individual student information cards
- `Badge` - Payment status indicators (paid, pending, overdue)
- `Progress` - Payment completion bars
- `Button` - Actions (Add Student, Make Payment, Download File)
- `Dialog` - Add/Edit student forms
- `Table` - Payment history, file downloads
- `Tabs` - Switch between multiple students
- `Alert` - Important notifications

**Director Dashboard Components:**
- `Table` - Student roster overview
- `Badge` - System status indicators
- `Card` - Statistics cards (total students, pending payments)
- `Alert` - Unmatched registrations notifications
- `Button` - Admin actions (CSV import, file management)
- `Progress` - System health indicators
- `Tabs` - Switch between admin sections

### Phase 2: Authentication & User Management ✅ COMPLETED
1. **✅ Integrate Supabase Auth authentication** - Supabase Auth configured for parents, directors, and boosters
2. **✅ Create unified dashboard** with role-based content (`/dashboard`)
3. **✅ Build parent dashboard component** - Student cards, add student form, real-time updates
4. **✅ Build director dashboard component** - Student roster table, admin overview cards
5. **✅ Build booster dashboard component** - Payment oversight access
6. **✅ Create parent registration** with student info form (name, instrument)
7. **✅ Build fuzzy string matching** system for student roster matching
8. **✅ Add "add student" functionality** to parent dashboard with real API integration
9. **✅ Create role switcher** for testing three user roles (Parent, Director, Booster)

### Phase 3: Student Roster Management ✅ COMPLETED
1. **✅ Create director student roster table** using shadcn/ui Table component
2. **✅ Build director review dashboard** for unmatched parent registrations
3. **✅ Add student-parent relationship tracking** with status management
4. **✅ Create student management** views for director with approve/reject functionality
5. **✅ Implement automatic seeding** of student roster in Docker and development

### Phase 4: Payment System ✅ CORE SYSTEM COMPLETED 
**Implementation Strategy: t3dotgg Pattern with Stripe Checkout Sessions**

**📚 Reference: t3dotgg Stripe Recommendations**
- **Source**: https://github.com/t3dotgg/stripe-recommendations
- **Key Principle**: Single source of truth with `syncStripeDataToUser()` function
- **Pattern**: Avoid complex webhook state management, use simple cache sync approach
- **Architecture**: Pre-create Stripe customers, use Checkout Sessions, cache all data in one JSON blob per user

**✅ COMPLETED - Core Payment Flow (Tasks 1-7)**
1. **✅ Database schema foundation** - Stripe fields added to User model (`stripeCustomerId`, `isGuestAccount`) + StripeCache table for t3dotgg pattern
2. **✅ Stripe dependencies & environment** - Packages installed (`stripe`, `@stripe/stripe-js`), env vars configured, validation added to startup.ts  
3. **✅ Core t3dotgg sync architecture** - Complete `syncStripeDataToUser()` function implemented with checkout session metadata mapping, `createStripeCustomerForUser()` built, TypeScript interfaces defined
4. **✅ Payment category enrollment system** - Two-step flow implemented: enroll first, pay later with hardcoded categories (Band Fees $250, Spring Trip $900 in $50 increments, Equipment $150 in $25 increments)
5. **✅ Stripe Checkout integration** - Hosted payment pages with incremental payment support using Checkout Sessions, payment UI with multiple increment options
6. **✅ Webhook-free architecture** - No webhook complexity, all payments use consistent sync pattern
7. **✅ Payment history dashboard** - Complete payment tracking with student details, categories, and status badges

**✅ COMPLETED - Guest & Oversight Features**
8. **✅ Guest checkout system** - Webhook-free guest payments with immediate ghost account creation
9. **✅ Ghost account creation** - Automatic accounts for matched payments, manual creation for unmatched
10. **🔄 Booster review dashboard** - Manual resolution of unmatched payments with ghost account creation
11. **🔄 Donation system** - General Fund integration with required notes (future enhancement)

**🎯 Current Status - Production Ready System**
- **✅ Complete authenticated parent payment flow**: Registration → Enrollment → Payment → History
- **✅ Complete guest payment system**: Webhook-free with immediate ghost account creation
- **✅ Admin oversight dashboards**: Correct payment categorization and manual resolution
- **✅ Real-time UI updates**: Progress bars, enrollment status, payment buttons with loading states
- **✅ t3dotgg sync pattern**: All payments use consistent sync approach, no webhook complexity
- **✅ Bug fixes applied**: Payment double-counting, dashboard categorization, enrollment creation
- **✅ Build validation passes**: All TypeScript compilation successful

**Key Technical Decisions:**
- **NO STRIPE WEBHOOKS**: Webhooks are complex, unreliable, and unnecessary for this use case
- Use Stripe Checkout Sessions (not Payment Intents) for PCI compliance and simplicity
- **t3dotgg sync pattern for ALL payments**: Authenticated users sync on dashboard load, ghost accounts sync when accessed
- Hardcoded payment categories: Band Fees ($250 full), Spring Trip ($900 in $50 increments), Equipment ($150 in $25 increments)
- Lazy Stripe customer creation (on first enrollment attempt, not registration)
- **Immediate ghost account creation**: For matched guest payments (confidence ≥0.8), create accounts before Stripe processing
- Notes optional for student payments, required for donations
- Ghost accounts auto-link siblings by last name matching

**🐛 Critical Bug Fixes Applied:**

**1. Guest Payment Enrollment Creation**
- **Issue**: Guest payments weren't creating enrollment records, causing incorrect "total owed" calculations
- **Root Cause**: Webhook dependency failed to create database records for matched payments
- **Solution**: Webhook-free immediate ghost account + enrollment creation for high-confidence matches
- **Result**: Guest payments now show correct totals in admin dashboard

**2. Payment Double-Counting**
- **Issue**: David Brown showed $500 total paid instead of $250
- **Root Cause**: Admin API counted both enrollment.amountPaid AND resolved guest payment amounts
- **Solution**: Filter out resolved guest payments (those with resolvedAt timestamp) from totals
- **Result**: Accurate payment totals, no double-counting

**3. Booster Dashboard Categorization**
- **Issue**: Unmatched guest payments appeared in "Resolved" tab instead of "Needs Review"
- **Root Cause**: Flawed filtering logic that categorized non-completed payments as "resolved"
- **Solution**: Simplified logic based on student matching status, not payment status
- **Result**: Correct categorization - unmatched = needs review, matched = resolved

### Phase 5: File Management 🔄 PENDING
1. **🔄 Create director file upload** system with "Forms" category
2. **🔄 Build file listing** and download system for parents
3. **🔄 Add file deprecation/archiving** functionality for director
4. **🔄 Create file management** dashboard

### Phase 6: Google Calendar Integration 🔄 PENDING
1. **🔄 Build Google Calendar sync** configuration (director enters calendar ID)
2. **🔄 Create calendar display** component for website
3. **🔄 Add calendar subscription** functionality for parents
4. **🔄 Make calendar publicly viewable**

### Phase 7: Analytics & Admin Dashboard 🔄 PENDING
1. **🔄 Set up Umami analytics** in Docker configuration
2. **🔄 Create director dashboard** with student/parent overview
3. **🔄 Add payment reporting** and analytics
4. **🔄 Build notification system** for manual student reviews

### Phase 8: Template Finalization 🔄 PENDING
1. **🔄 Create comprehensive configuration** examples
2. **🔄 Write deployment documentation** and setup guide
3. **🔄 Build demo site** with sample data
4. **🔄 End-to-end testing** and optimization

### Current Implementation Status

**✅ Core Features Completed:**
- Three-role authentication system (Parent, Director, Booster)
- Unified dashboard with role-based content
- Parent student registration with fuzzy matching
- Director student roster management table
- Real-time student-parent relationship tracking
- Automatic database seeding for development and production
- Role switching for testing functionality

**📊 Database Schema:**
- User authentication with roles (PARENT, DIRECTOR, BOOSTER)
- Student roster with name and instrument
- StudentParent relationships with status tracking (PENDING, ACTIVE)
- Soft delete functionality with deletedAt timestamps
- Automatic seeding of 8 sample students

**🔧 API Endpoints:**
- `/api/students/add` - Add student with fuzzy matching
- `/api/students` - Get parent's students
- `/api/director/students` - Get all students for director
- `/api/user/update-role` - Update user role for testing
- `/api/auth/[...all]` - Legacy Better Auth endpoints (migrated to Supabase)

**🎯 Current System Architecture**

**✅ Complete Payment System (t3dotgg Pattern):**
- **Database Schema**: Full payment tables with enrollment tracking
- **Stripe Integration**: Checkout Sessions with webhook-free sync pattern  
- **Payment Categories**: Band Fees ($250), Spring Trip ($900 in $50 increments), Equipment ($150 in $25 increments)
- **Authenticated Flow**: Two-step enrollment → payment → sync pattern
- **Guest Flow**: Immediate ghost account creation for matches, manual resolution for unmatched
- **Admin Oversight**: Complete payment tracking and manual resolution tools

**🚀 Next Enhancement Opportunities:**
- **File Management System**: Director upload, parent download with categorization
- **Google Calendar Integration**: External calendar display and subscription
- **Analytics Dashboard**: Payment reporting and system metrics
- **Donation System**: General Fund integration with required notes

**💡 Architecture Lessons Learned:**

**Database as Single Source of Truth:**
- All application logic reads from database tables, not JSON cache
- Stripe is upstream source, database must be synced from Stripe data
- Dual-write pattern required: update both Stripe AND database consistently

**Webhook-Free Benefits:**
- Simplified architecture without webhook complexity or failure handling
- Consistent sync pattern for all payment types (authenticated + guest)
- Immediate feedback for matched guest payments in admin dashboard
- Reliable processing without webhook delivery failures

## 🔧 CURRENT IMPLEMENTATION STATUS & NEXT STEPS

### ✅ CORE PAYMENT SYSTEM COMPLETE - Production Ready

**🎉 MAJOR MILESTONE ACHIEVED:**
The authenticated parent payment flow is **fully functional and production-ready**. Parents can:
1. **Register** and add students with fuzzy matching
2. **Enroll** students in payment categories (Band Fees, Spring Trip, Equipment) 
3. **Make payments** in configurable increments via Stripe Checkout
4. **Track progress** with real-time progress bars and payment history
5. **View complete payment history** with student details and transaction status

**✅ Technical Foundation Complete:**
- User model extended with `stripeCustomerId` and `isGuestAccount` fields
- StripeCache table with t3dotgg JSON data pattern
- Stripe packages: `stripe` (server), `@stripe/stripe-js` (client)
- Environment variables: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**✅ Key Files Implemented:**
- `src/lib/stripe.ts` - Stripe server configuration
- `src/types/stripe.ts` - Complete TypeScript interfaces for enrollment & payments
- `src/lib/stripe-cache.ts` - t3dotgg implementation with checkout session metadata mapping
- `src/app/api/payments/` - Complete API endpoints: enroll, enrollments, create-checkout, history
- `src/app/api/payments/guest-checkout/` - Webhook-free guest payment processing
- `src/components/student-cards.tsx` - Enhanced with payment UI and enrollment management
- `src/components/payment-history.tsx` - Complete payment history display

**✅ Core Functions Working:**
- `syncStripeDataToUser()` - Fixed to properly map checkout session metadata to payment data
- `enrollStudentInCategory()` - Two-step enrollment system 
- `createStripeCustomerForUser()` - Lazy customer creation on first enrollment
- Payment UI with multiple increment options (single, multiple, pay all)
- Real-time enrollment status updates and progress tracking

## 🎓 CRITICAL ARCHITECTURE LESSONS LEARNED

### **Database as Single Source of Truth**
**Issue Discovered:** Payment totals showed $0 in admin dashboard despite working correctly in parent dashboard.

**Root Cause:** 
- Parent dashboard used StripeCache JSON (correct amounts)
- Admin dashboard used database tables (always $0 because never updated)
- `enrollStudentInCategory()` only updated Stripe metadata, never created database records

**Key Lessons:**
1. **Database is ALWAYS the source of truth** - All application logic should read from database tables
2. **Stripe is the upstream source** - Database must be synced from Stripe data, not the other way around
3. **JSON cache is for convenience only** - StripeCache should supplement, not replace database queries
4. **Dual-write pattern required** - Every operation must update both Stripe AND database consistently

### **Proper t3dotgg Implementation**
**Corrected Pattern:**
```typescript
// WRONG: Only update cache
await updateStripeCustomerMetadata(enrollments)

// RIGHT: Update database AND cache
await createDatabaseEnrollmentRecord(studentId, categoryId, totalOwed)
await updateStripeCustomerMetadata(enrollments)
await syncStripeDataToUser(userId) // Ensures database stays current
```

### **Enum/Category Name Consistency**
**Issue:** Mixed usage of enum keys vs display names across codebase
- Stripe metadata: `'BAND_FEES'` (enum key)
- Database lookups: `'Band Fees'` (display name)
- This caused sync failures and data inconsistencies

**Solution:** Single source of truth for category definitions:
```typescript
export const PAYMENT_CATEGORIES = {
  BAND_FEES: { name: 'Band Fees', totalAmount: 25000 },
  // Always use categoryConfig.name for database operations
}
```

### **Data Flow Architecture**
**Correct Flow:**
1. **User Action** → API endpoint
2. **Database Write** → Create/update records in database tables
3. **Stripe Sync** → Update Stripe customer metadata  
4. **Cache Refresh** → Sync latest Stripe data back to database
5. **UI Display** → Read from database tables (single source of truth)

### **Debugging Best Practices**
When payment/enrollment data shows inconsistencies:
1. **Check database records first** - Do `StudentPaymentEnrollment` records exist?
2. **Verify sync functions** - Are database updates happening in enrollment/payment flows?
3. **Trace enum usage** - Are category names consistent between Stripe and database?
4. **Add comprehensive logging** - Log both Stripe data AND database lookups

### **Critical Development Rules**
1. **Never read from cache for business logic** - Always query database tables
2. **Always dual-write** - Update database AND Stripe in every operation
3. **Use single enum source** - Reference `PAYMENT_CATEGORIES[key].name` consistently
4. **Test admin views** - They often reveal database sync issues that parent views hide

### 🎯 NEXT PRIORITIES - File Management & Database Backups

**Phase 9: Email System (Resend) ✅ COMPLETED**
1. **✅ Complete email infrastructure** - Centralized EmailService with Resend integration
2. **✅ Payment notification emails** - Parent confirmations + booster notifications for all payments
3. **✅ Admin notifications** - Director notifications for unmatched registrations (existing)
4. **✅ Reliable delivery system** - Server-side execution guarantees email sending
5. **✅ Template system** - HTML email templates with proper formatting
6. **🔄 Email preferences** - Opt-out management for different notification types (future enhancement)

**Phase 10: File Management System 🔄 NEXT**
1. **Director file upload system** - Upload interface with category selection (starting with "Forms")
2. **File categorization** - Organized file storage with metadata tracking
3. **Parent download interface** - Secure file access for authenticated users only
4. **File deprecation/archiving** - Director can mark files as outdated
5. **File management dashboard** - Director interface for upload/archive/organize files
6. **Access control** - File visibility based on user roles and authentication status

**Phase 11: Database Backup System 🔄 PENDING**
1. **Basic backup infrastructure** - SQLite backup scripts with timestamp and verification
2. **Docker backup integration** - Backup container with volume mounts and scheduling
3. **Automated backup scheduling** - Daily backups with cron jobs and retention policies
4. **Advanced backup features** - Cloud storage integration (S3, Google Cloud)
5. **Monitoring and alerts** - Backup success/failure notifications via email
6. **Restoration procedures** - Documented restoration process and rollback scripts

**Alternative Future Phases:**
- **Google Calendar Integration** - External calendar display and subscription
- **Analytics & Reporting** - Umami analytics, payment reporting dashboard
- **White-label Deployment** - Configuration system, Docker optimization
- **Donation System Enhancement** - General Fund integration with required notes (basic structure exists)

### 🚀 Deployment Readiness
- **✅ Build validation passes** - All TypeScript compilation successful
- **✅ Critical bugs fixed** - Payment metadata sync issue resolved, authentication issues fixed
- **✅ API endpoints tested** - Core enrollment and payment flow validated
- **✅ Student details page** - Complete drill-down view for Directors/Boosters with payment oversight
- **⚠️ Environment variables** - Production Stripe keys required

### 📚 t3dotgg Implementation Validated
- **✅ Single source of truth** - All payment data cached in StripeCache JSON
- **✅ Checkout session metadata** - Properly mapped to payment history
- **✅ Webhook-free pattern** - All payments use consistent sync approach, no webhook complexity
- **✅ Lazy customer creation** - Customers created on first enrollment attempt

## 🎯 LATEST UPDATES - Student Details & System Improvements

### **Student Details Page Implementation** ✅ COMPLETED
**Added comprehensive student drill-down functionality for payment oversight:**

**New Features:**
- **Dedicated Route**: `/dashboard/student/[studentId]` with server-side authentication
- **Role-based Access**: Directors and Boosters only (Parents redirected)
- **Comprehensive Data**: Student info, payment categories, parent details, payment history
- **Visual Indicators**: Payment progress bars, enrollment status, missing payment highlights
- **Payment Timeline**: Combined authenticated + guest payment history with status tracking

**Technical Implementation:**
- Server-side data fetching with direct Prisma queries (no API roundtrip)
- Proper Next.js App Router patterns with `getSession()` helper
- Dynamic rendering with `export const dynamic = 'force-dynamic'`
- Updated payments overview table to link to dedicated pages (replaced modal approach)

**Files Modified:**
- `src/app/dashboard/student/[studentId]/page.tsx` - Student details route
- `src/components/student-details.tsx` - Comprehensive details component
- `src/components/students-payments-overview.tsx` - Navigation integration

### **Authentication & API Fixes** ✅ COMPLETED
**Resolved critical authentication issues affecting payment history and API calls:**

**Problems Fixed:**
1. **JSON Parse Errors**: Frontend receiving HTML instead of JSON from APIs
2. **Authentication Failures**: API calls not including session cookies
3. **404 Errors**: Debug endpoint `/api/debug/fix-customer` didn't exist

**Solutions Applied:**
- Added `credentials: 'include'` to all authenticated fetch calls
- Removed debug "Fix Payment History" button and associated code
- Fixed payment history, student data, and admin API authentication

**Files Fixed:**
- `src/components/payment-history.tsx` - Payment history authentication
- `src/components/student-cards.tsx` - Student and enrollment data fetching
- `src/components/students-payments-overview.tsx` - Admin payments overview
- `src/components/parent-dashboard.tsx` - Removed debug functionality

### **System Status - Production Ready Core** 🚀
**All Core Features Operational:**
- ✅ **Authentication System**: Three-role setup (Parent, Director, Booster) working correctly
- ✅ **Student Management**: Registration, linking, fuzzy matching, and oversight dashboards
- ✅ **Payment System**: Complete t3dotgg pattern implementation with Stripe integration
- ✅ **Admin Oversight**: Student details pages with comprehensive payment tracking
- ✅ **Database Architecture**: Proper sync between Stripe and database records

**Known Working Flows:**
1. Parent registration → Student linking → Payment enrollment → Stripe checkout → Payment history
2. Director student management → Manual linking → Payment oversight → Student details drill-down
3. Booster payment oversight → Student detail reviews → System administration

**Ready for Production Use**: Core authenticated parent payment flow and admin oversight fully functional

### **Email System Consolidation** ✅ COMPLETED
**Eliminated duplicate email sending logic and added booster notifications:**

**Problem Solved:**
- Had duplicate email sending in both `success/page.tsx` and `stripe-cache.ts`
- Booster notifications weren't being sent for payments
- Success page email sending was unreliable (dependent on user browser behavior)

**New Architecture:**
- **Single consolidated function**: `EmailService.sendPaymentNotificationEmails()` sends both parent confirmation AND booster notification emails in parallel
- **Server action approach**: Emails guaranteed to send server-side during payment redirect flow
- **Eliminated all duplication**: Removed `sendMissedConfirmationEmails` from stripe-cache.ts

**Key Changes:**
1. **`src/lib/email.ts`**: Added `sendPaymentNotificationEmails()` function + fixed booster email template (was showing `parentEmail` instead of `Parent:`)
2. **`src/app/payment/success/page.tsx`**: Moved email sending to `handlePaymentEmails()` server action that runs before page renders
3. **`src/lib/stripe-cache.ts`**: Removed `sendMissedConfirmationEmails` function and EmailService import

**Benefits Achieved:**
- ✅ **Reliable delivery**: Server-side execution guarantees emails sent regardless of user behavior
- ✅ **Booster notifications**: Program coordinators now automatically notified of all payments
- ✅ **Better UX**: Success page loads immediately without client-side email API delays
- ✅ **Single code path**: Easier maintenance, debugging, and future enhancements
- ✅ **Production ready**: Build passes, no TypeScript errors

**Files Modified:**
- `src/lib/email.ts` - Added consolidated email function
- `src/app/payment/success/page.tsx` - Server action email handling
- `src/lib/stripe-cache.ts` - Removed duplicate email logic

---

## 🎯 CURRENT MULTI-TENANT SaaS STATUS

### **Architecture Transformation: Single-Tenant → Multi-Tenant SaaS**

**✅ COMPLETED MIGRATION:**
- **Database**: Migrated from SQLite → PostgreSQL with Prisma ORM
- **Schema**: Added tenant isolation with `tenantId` foreign keys on all domain tables
- **Infrastructure**: Added `tenants`, `memberships`, `connectedAccounts` tables for SaaS operations
- **Stripe**: Ready for Stripe Connect integration (tables and sync infrastructure exist)

**🔄 REMAINING WORK FOR FIRST CUSTOMER:**
1. **Tenant Context Middleware** (1-2 days) - Extract tenant from request, filter all queries
2. **Stripe Connect Integration** (2-3 days) - Account creation and linking workflow  
3. **Customer Onboarding** (2-3 days) - School signup form with admin user provisioning
4. **Production Deployment** (1 day) - Supabase setup with domain configuration

**💰 READY FOR REVENUE:**
- **Core payment system fully functional** - Parents can enroll and pay, admin oversight works
- **Multi-tenant database schema complete** - All tables have tenant isolation
- **Email notifications working** - Payment confirmations and admin alerts  
- **Authentication system scalable** - Supabase Auth supports multi-tenant scenarios

**🚀 TIME TO FIRST PAYING CUSTOMER: 1-2 weeks**

The platform is **production-ready** for the core band program use case. Adding multi-tenancy is the final step to transform this into a profitable SaaS business.