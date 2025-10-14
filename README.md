# Band Program SaaS Platform

A multi-tenant SaaS application for managing band programs, built with Next.js, Supabase, and Prisma.

## Tech Stack

- **Frontend**: Next.js 15.3.4 + TypeScript + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: Supabase Auth (multi-role: Parents, Directors, Boosters)
- **Payments**: Stripe Connect + Direct Stripe integration
- **Email**: Resend (transactional emails)
- **Infrastructure**: Supabase (local & production) + Docker deployment

## Quick Start

Assuming you have Docker running and Supabase CLI installed:

```bash
# 1. Install dependencies
npm install

# 2. Start Supabase (if not already running)
supabase start
# Copy the anon key and service_role key from the output

# 3. Configure environment variables
cp .env.example .env.development
# Edit .env.development:
#   - Set NEXT_PUBLIC_SUPABASE_ANON_KEY (from step 2)
#   - Set SUPABASE_SERVICE_ROLE_KEY (from step 2)
#   - Add Stripe test keys (optional for now)
#   - Add Resend API key (optional for now)

# 4. Run migrations (creates tables + generates Prisma client)
npm run db:migrate

# 5. Seed database (creates test tenants, students, and users)
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- **Director**: `director@default.edu` / `password123`
- **Parent**: `parent1@default.edu` / `password123`

### Reset Database (for testing)

```bash
# Clean slate (drop → migrate, no seed)
npm run db:reset

# Quick testing (drop → migrate → auto-seed)
npm run db:migrate:reset
```

---

## Prerequisites

Before you begin, make sure you have installed:

- **Node.js** (v18 or later) - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Supabase CLI** - Install via npm:
  ```bash
  npm install -g supabase
  ```

## Local Development Setup

Follow these steps exactly to set up the application from scratch:

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Supabase Local Development Stack

This command starts a local PostgreSQL database, authentication server, and other Supabase services via Docker:

```bash
supabase start
```

**Important**: This command will:
- Download and start all required Docker containers (~2-3 minutes on first run)
- Create a local PostgreSQL database on port `5433`
- Start Supabase Studio (web UI) on `http://127.0.0.1:8003`
- Display your local API keys in the terminal

**Example output you'll see:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:8000
     GraphQL URL: http://127.0.0.1:8000/graphql/v1
  S3 Storage URL: http://127.0.0.1:8000/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:5433/postgres
      Studio URL: http://127.0.0.1:8003
    Inbucket URL: http://127.0.0.1:8004
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGc...
service_role key: eyJhbGc...
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

**Save these keys** - you'll need the `anon key` and `service_role key` in the next step.

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.development
```

Edit `.env.development` and update these critical values with the keys from the previous step:

```bash
# Database (use the DB URL from supabase start output)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres"

# Supabase (copy these from the supabase start output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key_from_supabase_start>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key_from_supabase_start>

# Required for Stripe (get test keys from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Required for email (get API key from https://resend.com/api-keys)
RESEND_API_KEY=re_YOUR_RESEND_API_KEY
FROM_EMAIL=noreply@yourapp.com
BOOSTER_EMAIL=support@yourapp.com
DIRECTOR_EMAIL=admin@yourapp.com

# Other required vars (defaults should work)
DEFAULT_TENANT_SLUG=default
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: The `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must match the keys output by `supabase start`

### 4. Run Database Migrations

Apply all database migrations to create the tables:

```bash
npm run db:migrate
```

This will:
- Apply all pending migrations to create tables
- Generate the Prisma Client automatically
- Create all tables for:
  - Multi-tenant infrastructure (tenants, memberships)
  - Student and parent management
  - Payment system (categories, enrollments, payments)
  - Stripe integration (cache, sync logs)

### 5. Seed the Database

Populate the database with test data (tenants, students, users):

```bash
npm run db:seed
```

This creates:
- **3 test tenants**: Default Band Program, Riverside High School, Northview Academy
- **15 students per tenant** with instruments and grades
- **Test users per tenant**:
  - Director: `director@[tenant].edu` (password: `password123`)
  - Booster: `booster@[tenant].edu` (password: `password123`)
  - Parents: `parent1@[tenant].edu`, `parent2@[tenant].edu`, `parent3@[tenant].edu` (password: `password123`)

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Test Credentials

After seeding, you can log in with these credentials:

**Default Tenant:**
- Director: `director@default.edu` / `password123`
- Booster: `booster@default.edu` / `password123`
- Parent: `parent1@default.edu` / `password123`

**Riverside Tenant:**
- Director: `director@riverside.edu` / `password123`
- Booster: `booster@riverside.edu` / `password123`
- Parent: `parent1@riverside.edu` / `password123`

**Northview Tenant:**
- Director: `director@northview.edu` / `password123`
- Booster: `booster@northview.edu` / `password123`
- Parent: `parent1@northview.edu` / `password123`

## Useful Commands

### Database Management

```bash
# View database in Prisma Studio (web UI)
npm run db:studio

# Create a new migration (after changing schema.prisma)
npm run db:migrate

# Reset database and re-seed (WARNING: deletes all data)
npm run db:migrate:reset

# Run seed script manually
npm run db:seed

# Check migration status
npm run db:migrate:status

# Pull schema from production database
npm run db:pull:prod
```

### Supabase Local Development

```bash
# Start Supabase (run this before npm run dev)
supabase start

# Stop Supabase (keeps data)
supabase stop

# Stop and delete all data
supabase stop --no-backup

# View Supabase status
supabase status

# View database migrations in Supabase
supabase db migrations list

# Reset Supabase completely (WARNING: deletes all data)
supabase db reset
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Resetting Your Local Database

If you want to completely reset and start fresh:

```bash
# Option 1: Reset without data (clean slate)
npm run db:reset          # Drop tables → migrate (no seed)
npm run db:seed          # Manually seed when ready

# Option 2: Reset with test data (quick testing)
npm run db:migrate:reset  # Drop tables → migrate → auto-seed

# Option 3: Reset via Supabase
supabase db reset        # Resets Supabase stack
npm run db:migrate       # Apply migrations
npm run db:seed         # Seed data

# Option 4: Complete teardown
supabase stop --no-backup  # Delete everything
supabase start             # Fresh start
npm run db:migrate        # Apply migrations
npm run db:seed           # Seed data
```

## Accessing Development Tools

Once `supabase start` is running, you can access:

- **Application**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:8003 (Database viewer, Auth management)
- **Prisma Studio**: `npm run db:studio` (Alternative database viewer)
- **Email Inbox (Inbucket)**: http://127.0.0.1:8004 (View emails sent locally)

## Troubleshooting

### Supabase won't start

```bash
# Check if Docker is running
docker ps

# Stop any conflicting services
supabase stop --no-backup

# Try starting again
supabase start
```

### Database connection errors

```bash
# Verify Supabase is running
supabase status

# Check DATABASE_URL in .env.development matches output
# Should be: postgresql://postgres:postgres@127.0.0.1:5433/postgres
```

### Migration errors

```bash
# Check migration status
npm run db:migrate:status

# If out of sync, reset and reapply
npm run db:migrate:reset
```

### Seed script fails

```bash
# Ensure Supabase is running first
supabase status

# Verify SUPABASE_SERVICE_ROLE_KEY is set correctly in .env.development

# Try seeding again
npm run db:seed
```

## Project Structure

```
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── dashboard/        # Role-based dashboard
│   │   ├── payment/          # Payment flows
│   │   └── api/              # API routes
│   ├── components/           # React components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                  # Utilities and integrations
│   │   ├── stripe.ts         # Stripe integration
│   │   ├── email.ts          # Resend email service
│   │   └── supabase/         # Supabase client setup
│   └── types/                # TypeScript type definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Database migrations
│   └── seed.ts               # Seed script
├── supabase/
│   └── config.toml           # Supabase local config
└── .env.development          # Local environment variables
```

## Key Features

- **Multi-tenant architecture** - Isolated data per school/organization
- **Role-based authentication** - Parent, Director, and Booster roles
- **Student management** - Fuzzy matching for parent-student linking
- **Payment system** - Stripe integration with enrollment tracking
- **Email notifications** - Automated payment confirmations
- **Admin oversight** - Director/Booster dashboards for payment tracking

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)

## Production Deployment

For production deployment instructions, see [DEPLOY.md](./DEPLOY.md).
