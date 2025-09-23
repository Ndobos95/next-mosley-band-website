#!/usr/bin/env tsx
/**
 * Custom migration runner that bypasses drizzle-kit issues with Supabase
 * Usage: npx tsx scripts/run-migration.ts 0002_dizzy_human_torch.sql
 */

import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment
dotenv.config({ path: '.env.production' })

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: npx tsx scripts/run-migration.ts <migration-file>')
  console.error('Example: npx tsx scripts/run-migration.ts 0002_dizzy_human_torch.sql')
  process.exit(1)
}

const migrationPath = path.join('drizzle', migrationFile)
if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`)
  process.exit(1)
}

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT!),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    }
  })

  try {
    console.log(`🔄 Running migration: ${migrationFile}`)

    const sql = fs.readFileSync(migrationPath, 'utf8')
    console.log(`📄 SQL content:\n${sql}\n`)

    const client = await pool.connect()
    await client.query(sql)
    client.release()

    console.log(`✅ Migration completed successfully: ${migrationFile}`)
  } catch (error) {
    console.error(`❌ Migration failed:`, error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()