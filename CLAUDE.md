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

### Payment System Design
- **Self-selection**: Parents choose activity categories for their student
- **Partial payments**: Configurable per-category (Band Fees = 100%, Trip Payment = partial allowed)
- **Per-student tracking**: Individual payment history and status
- **Multi-student support**: Parents can manage multiple children

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
3. Select payment categories for activities student participates in
4. Make full or partial payments based on category rules
5. View/download files and subscribe to calendar

## Database Schema Priorities
- user_students (parent-student relationships)
- payments (Stripe tracking with per-student categorization)
- students (roster with fuzzy matching fields)
- payment_categories (configurable with partial payment flags)
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

### Phase 4: Payment System 🔄 PENDING
1. **🔄 Integrate Stripe** with webhook handling
2. **🔄 Create configurable payment categories** (generic: Band Fees, Trip Payment, Equipment)
3. **🔄 Build parent self-selection** system for payment categories
4. **🔄 Add partial payment support** with per-category configuration (some 100%, some partial)
5. **🔄 Create payment history** and tracking per student

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

**🚧 Immediate Next Tasks:**
1. **Director Approval System** - Implement functionality for directors to approve/reject pending student registrations
   - Add approve/reject API endpoints for director actions
   - Update director table to handle approve/reject button functionality
   - Create notification system for pending registrations
   - Handle status updates (PENDING → ACTIVE or rejected/deleted)

**🎯 Next Priority: Phase 4 - Payment System**
Ready to implement Stripe integration and configurable payment categories after completing director approval workflow.