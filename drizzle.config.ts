import { defineConfig } from 'drizzle-kit'
import { config as loadEnv } from 'dotenv'

// Load env from .env.local first (Next.js style), then fallback to .env
loadEnv({ path: '.env.local' })
loadEnv()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
