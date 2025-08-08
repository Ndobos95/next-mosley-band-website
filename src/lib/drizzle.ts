import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.warn('DATABASE_URL not set; Drizzle client will not be initialized')
}

const globalForDrizzle = globalThis as unknown as {
  __drizzleDb?: ReturnType<typeof drizzle>
  __pgPool?: Pool
}

export const pgPool = globalForDrizzle.__pgPool ?? (databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } }) : undefined)
export const db = globalForDrizzle.__drizzleDb ?? (pgPool ? drizzle(pgPool) : undefined as unknown as ReturnType<typeof drizzle>)

if (process.env.NODE_ENV !== 'production') {
  if (pgPool) globalForDrizzle.__pgPool = pgPool
  if (db) globalForDrizzle.__drizzleDb = db
}
