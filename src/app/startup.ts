import { initializeDatabase } from '@/lib/db-init'

// Log environment variables status
console.log('🔧 Environment Variables Status:')
console.log(`  NODE_ENV: ${!!process.env.NODE_ENV}`)
console.log(`  DATABASE_URL: ${!!process.env.DATABASE_URL}`)
console.log(`  AUTH_SECRET: ${!!process.env.AUTH_SECRET}`)
console.log(`  BETTER_AUTH_URL: ${!!process.env.BETTER_AUTH_URL}`)
console.log(`  NEXT_PUBLIC_APP_URL: ${!!process.env.NEXT_PUBLIC_APP_URL}`)
console.log(`  RESEND_API_KEY: ${!!process.env.RESEND_API_KEY}`)
console.log(`  FROM_EMAIL: ${!!process.env.FROM_EMAIL}`)
console.log(`  GOOGLE_CLIENT_ID: ${!!process.env.GOOGLE_CLIENT_ID}`)
console.log(`  GOOGLE_CLIENT_SECRET: ${!!process.env.GOOGLE_CLIENT_SECRET}`)

// Initialize database on app startup (only in production with DATABASE_URL)
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  initializeDatabase().catch(console.error)
}