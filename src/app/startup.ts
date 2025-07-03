import { initializeDatabase } from '@/lib/db-init'

// Initialize database on app startup
if (process.env.NODE_ENV === 'production') {
  initializeDatabase().catch(console.error)
}