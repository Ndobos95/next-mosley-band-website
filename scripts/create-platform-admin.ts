#!/usr/bin/env npx tsx
import { config } from 'dotenv'
config({ path: '.env.production' })

import { createClient } from '@supabase/supabase-js'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { userProfiles } from '../src/db/schema'

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function createPlatformAdmin() {
  const email = process.argv[2]
  const password = process.argv[3]
  const displayName = process.argv[4] || 'Platform Administrator'

  if (!email || !password) {
    console.error('❌ Missing required arguments\n')
    console.log('Usage: npx tsx scripts/create-platform-admin.ts "admin@email.com" "password" ["Display Name"]')
    console.log('Example: npx tsx scripts/create-platform-admin.ts "admin@boosted.band" "SecurePass123!" "Platform Admin"\n')
    process.exit(1)
  }

  // Check all required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env.production')
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.production')
    process.exit(1)
  }

  console.log('🔍 Environment check:')
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('  SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('  SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')

  // Initialize database connection
  console.log('🔌 Connecting to database...')
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false
  })
  const db = drizzle(pgPool)

  // Test database connection
  try {
    await pgPool.query('SELECT 1')
    console.log('✅ Database connection successful')
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError)
    process.exit(1)
  }

  try {
    console.log('🔐 Creating platform admin account...')

    // 1. Create Supabase auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.error('❌ This email is already registered')
        console.log('If you need to update an existing user to platform admin, use the update-to-platform-admin.ts script')
      } else {
        console.error('❌ Error creating auth user:', authError.message)
      }
      process.exit(1)
    }

    if (!authUser.user) {
      console.error('❌ Failed to create user')
      process.exit(1)
    }

    console.log('✅ Auth user created:', authUser.user.id)

    // 2. Create user profile with PLATFORM_ADMIN role
    await db.insert(userProfiles).values({
      id: authUser.user.id,
      email,
      role: 'PLATFORM_ADMIN',
      displayName,
      tenantId: null, // Platform admins don't belong to any specific tenant
    })

    console.log('✅ User profile created with PLATFORM_ADMIN role')

    console.log('\n=====================================')
    console.log('🎉 Platform Admin Account Created!')
    console.log('=====================================')
    console.log(`Email: ${email}`)
    console.log(`Password: [hidden]`)
    console.log(`Role: PLATFORM_ADMIN`)
    console.log(`Display Name: ${displayName}`)
    console.log('\nYou can now log in at:')
    console.log('- Development: http://localhost:3000/login')
    console.log('- Production: https://boosted.band/login')
    console.log('\nAs a platform admin, you can:')
    console.log('- Access any tenant without restrictions')
    console.log('- Generate invite codes at /admin/invites')
    console.log('- View platform-wide analytics')
    console.log('- Manage all schools and users\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating platform admin:', error)
    process.exit(1)
  }
}

createPlatformAdmin()