# Band Program Website Template - Development Plan

## Project Overview
This is a reusable Next.js TypeScript template for high school band program websites. The template provides payment processing, file management, student-parent matching, and Google Calendar integration while being easily customizable for different band programs.

## Tech Stack Decisions
- **Frontend:** Next.js + TypeScript + shadcn/ui
- **Database:** SQLite + Prisma ORM
- **Authentication:** Clerk (parents only, no student accounts)
- **Payments:** Stripe (handles own email confirmations)
- **Analytics:** Umami (self-hosted, privacy-first)
- **Calendar:** Google Calendar integration
- **Deployment:** Docker container
- **Package Manager:** npm

## Key Features & Requirements

### White-Label Configuration
- File-based JSON configuration for easy customization
- Configurable branding: school colors, name, contact info, logos
- No web-based admin configuration editing (developer setup only)

### User Roles & Authentication
- **Parents:** Can register, manage students, make payments, view files/calendar
- **Director:** Single admin role with full access to dashboard, file uploads, roster management
- **No student accounts needed**

### Student-Parent Matching System
- **Director Workflow:**
  - Imports student roster via CSV (name, instrument)
  - Reviews unmatched parent registrations in dashboard
  - Can manually link parents to students when needed
- **Parent Workflow:**
  - Enters student info during registration (legal name, instrument)
  - Gets real-time feedback: "Match found!" or "Manual verification needed"
  - Can add additional students from dashboard for multi-child families
- **Privacy Protection:** No dropdown lists of student names to prevent data leaks
- **Fuzzy Matching:** Backend handles typos, nicknames, partial matches

### Payment System
- **Stripe Integration:** Full webhook handling for payment processing
- **Self-Selection:** Parents choose which activities their student participates in
- **Payment Categories:** Configurable generic categories (Band Fees, Trip Payment, Equipment)
- **Partial Payments:** Configurable per-category (some require 100%, others allow partial)
- **Per-Student Tracking:** Payment history and status tracked individually
- **Multi-Student Support:** Parents can pay for multiple children

### File Management
- **Director Upload:** Simple file upload with "Forms" category initially
- **File Access:** All logged-in parents can view and download
- **File Deprecation:** Director can archive/remove outdated files
- **No Versioning:** Simple file replacement model
- **No Bulk Operations:** Individual file management only

### Google Calendar Integration
- **External Calendar:** Director manages band calendar in Google Calendar
- **Website Display:** Calendar embedded/displayed on website
- **Parent Subscription:** Parents can subscribe to calendar for personal sync
- **Public Access:** Calendar viewable without login
- **No RSVP:** Simple display and subscription only
- **No Recurring Events:** One-time event management

### Analytics & Reporting
- **Umami Analytics:** Self-hosted, privacy-first website analytics
- **Director Dashboard:** Student/parent overview, payment reporting
- **Manual Review Notifications:** Email alerts for unmatched student registrations

## Development Phases

### Phase 1: Foundation & Configuration
1. Initialize Next.js project with TypeScript and shadcn/ui
2. Create configuration system (file-based JSON for branding, colors, contact info)
3. Set up Prisma with SQLite and design database schema
4. Create Docker configuration for single-container deployment

### Phase 2: Authentication & User Management
5. Integrate Clerk authentication (parents only, no student accounts)
6. Create parent registration with student info form (name, instrument)
7. Build fuzzy string matching system for student roster matching
8. Add "add student" functionality to parent dashboard

### Phase 3: Student Roster Management
9. Create director CSV import system (student name, instrument)
10. Build director review dashboard for unmatched parent registrations
11. Add manual student-parent linking interface for director
12. Create student management views for director

### Phase 4: Payment System
13. Integrate Stripe with webhook handling
14. Create configurable payment categories (generic: Band Fees, Trip Payment, Equipment)
15. Build parent self-selection system for payment categories
16. Add partial payment support with per-category configuration (some 100%, some partial)
17. Create payment history and tracking per student

### Phase 5: File Management
18. Create director file upload system with "Forms" category
19. Build file listing and download system for parents
20. Add file deprecation/archiving functionality for director
21. Create file management dashboard

### Phase 6: Google Calendar Integration
22. Build Google Calendar sync configuration (director enters calendar ID)
23. Create calendar display component for website
24. Add calendar subscription functionality for parents
25. Make calendar publicly viewable

### Phase 7: Analytics & Admin Dashboard
26. Set up Umami analytics in Docker configuration
27. Create director dashboard with student/parent overview
28. Add payment reporting and analytics
29. Build notification system for manual student reviews

### Phase 8: Template Finalization
30. Create comprehensive configuration examples
31. Write deployment documentation and setup guide
32. Build demo site with sample data
33. End-to-end testing and optimization

## Database Schema Design

### Core Tables
- **users** (parents) - Clerk integration
- **students** - roster data with fuzzy matching fields
- **user_students** - parent-student relationships
- **payments** - Stripe payment tracking
- **payment_categories** - configurable payment types
- **files** - uploaded documents with metadata
- **configuration** - runtime settings

## Configuration Structure
```json
{
  "school": {
    "name": "Example High School Band",
    "colors": {
      "primary": "#FF6B35",
      "secondary": "#4CAF50"
    },
    "contact": {
      "email": "band@example.edu",
      "phone": "(555) 123-4567"
    }
  },
  "features": {
    "payments": true,
    "fileSharing": true,
    "calendar": true,
    "analytics": true
  },
  "paymentCategories": [
    {"name": "Band Fees", "allowPartial": false},
    {"name": "Trip Payment", "allowPartial": true},
    {"name": "Equipment", "allowPartial": false}
  ]
}
```

## Deployment Strategy
- Single Docker container with all services
- SQLite database file for persistence
- Environment variables for sensitive configuration
- Volume mounts for file uploads and database
- Built-in Umami analytics container

## Success Criteria
- Easy fork-and-deploy for new band programs
- Minimal technical knowledge required for setup
- Secure student data handling with privacy protection
- Reliable payment processing with proper tracking
- Simple file sharing workflow
- Responsive design for mobile parents

This template will serve as a foundation that can be easily customized and deployed for multiple band programs while maintaining security, privacy, and ease of use.