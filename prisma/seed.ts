/**
 * Prisma Seed Script - Multi-Tenant Band Program SaaS
 *
 * Run with: npm run db:seed
 * Reset and reseed: npm run db:migrate:reset (includes automatic seeding)
 *
 * This script creates:
 * - Multiple tenants (band programs)
 * - Payment categories for each tenant
 * - Test students with instruments for each tenant
 * - Test users (Director, Booster, Parents) for each tenant via Supabase Auth
 *
 * Safe to run multiple times - uses upsert for idempotency
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Define multiple tenants to create
const TENANTS = [
  {
    slug: 'default',
    name: 'Default Band Program',
    director_email: 'director@default.edu',
    director_name: 'Sarah Thompson',
  },
  {
    slug: 'riverside',
    name: 'Riverside High School',
    director_email: 'director@riverside.edu',
    director_name: 'Michael Rodriguez',
  },
  {
    slug: 'northview',
    name: 'Northview Academy',
    director_email: 'director@northview.edu',
    director_name: 'Jennifer Chen',
  },
]

// Student rosters by instrument
const INSTRUMENTS = {
  woodwinds: ['Flute', 'Clarinet', 'Alto Saxophone', 'Tenor Saxophone', 'Oboe', 'Bassoon'],
  brass: ['Trumpet', 'French Horn', 'Trombone', 'Tuba', 'Baritone', 'Euphonium'],
  percussion: ['Percussion', 'Percussion', 'Percussion'], // More common
}

const FIRST_NAMES = ['Emily', 'James', 'Sarah', 'Michael', 'Jessica', 'Daniel', 'Ashley', 'Ryan',
  'Sophia', 'Matthew', 'Olivia', 'Ethan', 'Emma', 'Noah', 'Isabella', 'Mason', 'Ava', 'Lucas',
  'Mia', 'Alexander', 'Charlotte', 'Benjamin', 'Amelia', 'William', 'Harper']

const LAST_NAMES = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
  'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson',
  'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker']

function generateStudentName(index: number, tenantSlug: string): string {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(index + tenantSlug.length) % LAST_NAMES.length]
  return `${firstName} ${lastName}`
}

function getRandomInstrument(index: number): string {
  const allInstruments = [...INSTRUMENTS.woodwinds, ...INSTRUMENTS.brass, ...INSTRUMENTS.percussion]
  return allInstruments[index % allInstruments.length]
}

async function createPaymentCategories(tenantId: string) {
  console.log('💰 Creating payment categories...')
  const categories = [
    {
      id: `BAND_FEES_${tenantId}`,
      tenant_id: tenantId,
      name: 'Band Fees',
      description: 'Annual band participation fees',
      full_amount: 25000, // $250.00
      allow_increments: false,
      increment_amount: null,
    },
    {
      id: `SPRING_TRIP_${tenantId}`,
      tenant_id: tenantId,
      name: 'Spring Trip',
      description: 'Spring band trip expenses',
      full_amount: 90000, // $900.00
      allow_increments: true,
      increment_amount: 5000, // $50.00
    },
    {
      id: `EQUIPMENT_${tenantId}`,
      tenant_id: tenantId,
      name: 'Equipment',
      description: 'Band equipment and supplies',
      full_amount: 15000, // $150.00
      allow_increments: true,
      increment_amount: 2500, // $25.00
    },
  ]

  for (const category of categories) {
    await prisma.payment_categories.upsert({
      where: {
        tenant_id_name: {
          tenant_id: tenantId,
          name: category.name
        }
      },
      update: {},
      create: category,
    })
    console.log(`  ✅ Category: ${category.name} ($${category.full_amount / 100})`)
  }
}

async function createStudents(tenantId: string, tenantSlug: string, count: number = 15) {
  console.log(`🎵 Creating ${count} test students...`)
  const grades = ['9', '10', '11', '12']

  for (let i = 0; i < count; i++) {
    const studentName = generateStudentName(i, tenantSlug)
    const instrument = getRandomInstrument(i)
    const grade = grades[i % grades.length]
    const studentId = `${tenantId}-${studentName.toLowerCase().replace(/\s+/g, '-')}`

    await prisma.students.upsert({
      where: { id: studentId },
      update: {},
      create: {
        id: studentId,
        tenant_id: tenantId,
        name: studentName,
        instrument: instrument,
        grade: grade,
        source: 'ROSTER',
      },
    })
    console.log(`  ✅ Student: ${studentName} - ${instrument} (Grade ${grade})`)
  }
}

async function createUsers(tenantId: string, tenantSlug: string, tenantName: string) {
  console.log('👥 Creating test users...')

  const testUsers = [
    { email: `director@${tenantSlug}.edu`, role: 'DIRECTOR', name: `${tenantName} Director` },
    { email: `booster@${tenantSlug}.edu`, role: 'BOOSTER', name: `${tenantName} Booster` },
    { email: `parent1@${tenantSlug}.edu`, role: 'PARENT', name: `Parent 1 (${tenantName})` },
    { email: `parent2@${tenantSlug}.edu`, role: 'PARENT', name: `Parent 2 (${tenantName})` },
    { email: `parent3@${tenantSlug}.edu`, role: 'PARENT', name: `Parent 3 (${tenantName})` },
  ]

  for (const user of testUsers) {
    try {
      // Try to create user in Supabase Auth
      const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          name: user.name,
          tenantId: tenantId,
        },
      })

      if (error) {
        // User might already exist, try to get existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find((u: any) => u.email === user.email)

        if (existingUser) {
          console.log(`  ⏭️  Supabase user exists: ${user.email}`)

          // Create/update user profile in database
          await prisma.user_profiles.upsert({
            where: { id: existingUser.id },
            update: {
              email: user.email,
              role: user.role,
              display_name: user.name,
              tenant_id: tenantId,
            },
            create: {
              id: existingUser.id,
              email: user.email,
              role: user.role,
              display_name: user.name,
              tenant_id: tenantId,
            },
          })
        } else {
          console.log(`  ⚠️  Could not create user: ${user.email} - ${error.message}`)
          continue
        }
      } else if (authUser?.user) {
        // Create user profile in database
        await prisma.user_profiles.upsert({
          where: { id: authUser.user.id },
          update: {
            email: user.email,
            role: user.role,
            display_name: user.name,
            tenant_id: tenantId,
          },
          create: {
            id: authUser.user.id,
            email: user.email,
            role: user.role,
            display_name: user.name,
            tenant_id: tenantId,
          },
        })
        console.log(`  ✅ User created: ${user.email} (${user.role})`)
      }

      // Create membership
      const userProfile = await prisma.user_profiles.findFirst({
        where: { email: user.email },
      })

      if (userProfile) {
        // Check if membership already exists
        const existingMembership = await prisma.memberships.findFirst({
          where: {
            user_id: userProfile.id,
            tenant_id: tenantId,
          },
        })

        if (!existingMembership) {
          await prisma.memberships.create({
            data: {
              user_id: userProfile.id,
              tenant_id: tenantId,
              role: user.role,
            },
          })
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error creating user ${user.email}:`, error)
    }
  }
}

async function main() {
  console.log('🌱 Starting multi-tenant database seeding...\n')

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create each tenant with full data
  for (const tenantConfig of TENANTS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📦 Setting up tenant: ${tenantConfig.name}`)
    console.log(`${'='.repeat(60)}\n`)

    // 1. Create tenant
    const tenant = await prisma.tenants.upsert({
      where: { slug: tenantConfig.slug },
      update: {},
      create: {
        slug: tenantConfig.slug,
        name: tenantConfig.name,
        status: 'active',
        director_email: tenantConfig.director_email,
        director_name: tenantConfig.director_name,
      },
    })
    console.log(`✅ Tenant created: ${tenant.name} (${tenant.id})\n`)

    // 2. Create payment categories
    await createPaymentCategories(tenant.id)
    console.log()

    // 3. Create students
    await createStudents(tenant.id, tenant.slug, 15)
    console.log()

    // 4. Create users
    await createUsers(tenant.id, tenant.slug, tenant.name)
    console.log()
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('🎉 Multi-tenant database seeding complete!')
  console.log(`${'='.repeat(60)}\n`)

  console.log('📝 Test Credentials (all tenants):')
  console.log('   Password: password123\n')

  for (const tenant of TENANTS) {
    console.log(`   ${tenant.name}:`)
    console.log(`     Director: director@${tenant.slug}.edu`)
    console.log(`     Booster:  booster@${tenant.slug}.edu`)
    console.log(`     Parents:  parent1@${tenant.slug}.edu, parent2@${tenant.slug}.edu, parent3@${tenant.slug}.edu`)
    console.log()
  }

  console.log('🚀 Quick Commands:')
  console.log('   npm run dev              - Start development server')
  console.log('   npm run db:studio        - Open Prisma Studio')
  console.log('   npm run db:migrate:reset - Reset & reseed database')
  console.log()
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
