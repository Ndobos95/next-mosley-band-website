import { initializeDatabase } from '@/lib/db-init'

// Initialize database on app startup (only in production with DATABASE_URL)
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  initializeDatabase().catch(console.error)
}