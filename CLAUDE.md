# Band Program Website Template - Claude Reference

## Tech Stack
- Next.js + TypeScript + shadcn/ui
- SQLite + Prisma ORM
- Better Auth authentication (parents and directors)
- Stripe payments (handles own emails)
- Umami analytics (self-hosted)
- Google Calendar integration
- Docker deployment

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

### Guest Payment Workflow
1. Enter parent name, email, student name, and payment details
2. System performs strict student name matching against roster
3. If matched: process payment and link to student record
4. If unmatched: create unmatched payment for booster review
5. Receive payment confirmation email

### Booster Review Workflow
1. Review unmatched payments in dashboard
2. Search for correct student matches
3. Create ghost accounts for parents without existing accounts
4. Link payments to correct student records
5. Add resolution notes for audit trail

## Database Schema Priorities
- users (with stripe_customer_id and isGhostAccount flag)
- students (roster with fuzzy matching fields, includes special "General Fund" student)
- student_parent (parent-student relationships with status tracking)
- payment_categories (hardcoded: Band Fees, Spring Trip, Equipment with increment rules)
- student_payment_enrollments (tracks total_owed vs amount_paid per student/category)
- payments (individual payment records with optional notes)
- guest_payments (non-authenticated payments with optional notes)
- donations (General Fund payments with required notes)
- unmatched_payments (for booster review with resolution notes)
- files (metadata with category and deprecation status)

## White-Label Requirements
- School name, colors, contact info in config file
- Payment categories customizable per school
- Feature toggles for payments/files/calendar/analytics
- Easy Docker deployment with volume mounts
- Minimal technical knowledge required for new deployments

## Development Priorities
1. Core authentication and user management
2. Student-parent matching with director review system
3. Payment system with category self-selection
4. File upload/download with deprecation
5. Google Calendar integration
6. Admin dashboard with analytics
7. White-label configuration and deployment

## Security Considerations
- No student PII exposed in dropdowns or API responses
- Payment data handled entirely by Stripe
- File access restricted to authenticated users
- SQLite database secured through Docker volume mounts
- Director email notifications for manual review cases only

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
1. **✅ Integrate Better Auth authentication** - Better Auth configured for parents, directors, and boosters
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
6. **✅ Webhook handler** - Simple routing to sync functions based on payment type, proper metadata handling from checkout sessions
7. **✅ Payment history dashboard** - Complete payment tracking with student details, categories, and status badges

**🔄 REMAINING - Guest & Oversight Features (Tasks 8-10)**
8. **🔄 Guest checkout system** - Non-authenticated payments with student matching
9. **🔄 Ghost account creation** - Automatic account creation for unmatched payments
10. **🔄 Booster review dashboard** - Manual resolution of unmatched payments
11. **🔄 Donation system** - General Fund integration with required notes

**🎯 Current Status - Production Ready Core**
- **✅ Complete authenticated parent payment flow**: Registration → Enrollment → Payment → History
- **✅ Real-time UI updates**: Progress bars, enrollment status, payment buttons with loading states
- **✅ t3dotgg pattern validated**: Checkout session metadata properly synced to payment cache
- **✅ Critical bug fixed**: Payment metadata mapping from checkout sessions to payment intents
- **✅ Build validation passes**: All TypeScript compilation successful

**Key Technical Decisions:**
- Use Stripe Checkout Sessions (not Payment Intents) for PCI compliance and simplicity
- Hardcoded payment categories: Band Fees ($250 full), Spring Trip ($900 in $50 increments), Equipment ($150 in $25 increments)
- Lazy Stripe customer creation (on first enrollment attempt, not registration)
- Notes optional for student payments, required for donations
- Ghost accounts auto-link siblings by last name matching
- Webhook idempotency through database tracking, not complex state management

**🐛 Bug Fixes Applied:**
- Fixed critical payment metadata sync issue where checkout session data wasn't being captured in payment history
- Updated sync function to fetch both paymentIntents and checkoutSessions for complete data

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
- `/api/auth/[...all]` - Better Auth endpoints

**🚧 Current Focus: Phase 4 - Payment System Implementation**

**Next Implementation Steps (t3dotgg Pattern):**
1. **Database Schema Updates** - Add payment tables with t3dotgg architecture
   - Add stripe_customer_id and isGhostAccount to users table
   - Create payment_categories, student_payment_enrollments, payments tables
   - Add guest_payments, donations, unmatched_payments tables
   - Create special "General Fund" student record

2. **Stripe Integration Foundation**
   - Install Stripe dependencies (@stripe/stripe-js, stripe server SDK)
   - Set up environment variables for Stripe keys and webhook secrets
   - Implement customer creation on user registration
   - Build core t3dotgg sync function architecture

3. **Payment Category Enrollment System**
   - Hardcode payment categories (Band Fees, Spring Trip, Equipment)
   - Build enrollment interface for parents
   - Implement payment increment validation
   - Create enrollment tracking system

4. **Stripe Checkout Integration**
   - Build checkout session creation
   - Implement webhook handler with t3dotgg routing
   - Add payment confirmation and email receipts
   - Create payment history dashboard

5. **Guest Checkout & Manual Review**
   - Build guest payment form with student matching
   - Implement ghost account creation system
   - Create booster review dashboard for unmatched payments
   - Add donation system with General Fund integration

**🎯 Long-term Goals:**
- Complete payment system implementation using t3dotgg pattern
- Build file management system
- Integrate Google Calendar
- Set up analytics and white-label configuration

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
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**✅ Key Files Implemented:**
- `src/lib/stripe.ts` - Stripe server configuration
- `src/types/stripe.ts` - Complete TypeScript interfaces for enrollment & payments
- `src/lib/stripe-cache.ts` - t3dotgg implementation with checkout session metadata mapping
- `src/app/api/payments/` - Complete API endpoints: enroll, enrollments, create-checkout, history
- `src/app/api/webhooks/stripe/` - Webhook handler with proper metadata sync
- `src/components/student-cards.tsx` - Enhanced with payment UI and enrollment management
- `src/components/payment-history.tsx` - Complete payment history display

**✅ Core Functions Working:**
- `syncStripeDataToUser()` - Fixed to properly map checkout session metadata to payment data
- `enrollStudentInCategory()` - Two-step enrollment system 
- `createStripeCustomerForUser()` - Lazy customer creation on first enrollment
- Payment UI with multiple increment options (single, multiple, pay all)
- Real-time enrollment status updates and progress tracking

### 🎯 NEXT PRIORITIES - Guest Payment & Oversight Features

**Remaining Tasks (Phase 4 completion):**
1. **Guest checkout system** - Non-authenticated payments with student name matching
2. **Ghost account creation** - Auto-create accounts for unmatched guest payments  
3. **Booster review dashboard** - Manual resolution interface for unmatched payments
4. **Donation system** - General Fund integration with required notes

**Alternative Next Phases:**
- **Phase 5: File Management** - Director upload system, parent downloads
- **Phase 6: Google Calendar** - Calendar integration and subscription  
- **Phase 7: Analytics & Reporting** - Umami analytics, payment reporting
- **Phase 8: White-label Deployment** - Configuration system, Docker optimization

### 🚀 Deployment Readiness
- **✅ Build validation passes** - All TypeScript compilation successful
- **✅ Critical bugs fixed** - Payment metadata sync issue resolved
- **✅ API endpoints tested** - Core enrollment and payment flow validated
- **⚠️ Webhook setup needed** - Stripe webhook URL configuration for production
- **⚠️ Environment variables** - Production Stripe keys and webhook secrets required

### 📚 t3dotgg Implementation Validated
- **✅ Single source of truth** - All payment data cached in StripeCache JSON
- **✅ Checkout session metadata** - Properly mapped to payment history
- **✅ Simple webhook pattern** - Direct sync on payment events, no complex state management
- **✅ Lazy customer creation** - Customers created on first enrollment attempt