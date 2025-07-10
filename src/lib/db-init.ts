import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export async function initializeDatabase() {
  console.log('🔄 Checking database status...')
  
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not configured')
    return
  }

  // Extract file path from DATABASE_URL (format: file:./path/to/db.db)
  const dbPath = databaseUrl.replace('file:', '')
  const dbDir = path.dirname(dbPath)
  
  try {
    // Ensure data directory exists
    if (!fs.existsSync(dbDir)) {
      console.log(`📁 Creating database directory: ${dbDir}`)
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Check if database file exists
    const dbExists = fs.existsSync(dbPath)
    console.log(`📊 Database file exists: ${dbExists ? 'Yes' : 'No'}`)

    if (!dbExists) {
      console.log('🔧 Running initial database migration...')
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        cwd: process.cwd()
      })
      console.log('✅ Database migration completed')
    } else {
      console.log('🔧 Checking for pending migrations...')
      try {
        execSync('npx prisma migrate deploy', { 
          stdio: 'inherit',
          cwd: process.cwd()
        })
        console.log('✅ Migrations up to date')
      } catch {
        console.log('⚠️ Migration check completed (may have been already up to date)')
      }
    }

    // Check if we need to seed data
    const prisma = new PrismaClient()
    const messageCount = await prisma.message.count()
    const studentCount = await prisma.student.count()
    console.log(`📝 Current message count: ${messageCount}`)
    console.log(`📝 Current student count: ${studentCount}`)

    if (messageCount === 0) {
      console.log('🌱 Seeding initial data...')
      const seedMessages = [
        { content: 'Welcome to the band program website!' },
        { content: 'This is a test message to verify SQLite persistence.' },
        { content: 'Container restarts should preserve this data.' },
        { content: 'Hello from the auto-seeded database!' }
      ]

      for (const message of seedMessages) {
        await prisma.message.create({ data: message })
      }
      console.log(`✅ Seeded ${seedMessages.length} initial messages`)
    }

    if (studentCount === 0) {
      console.log('🌱 Seeding student roster...')
      const rosterStudents = [
        { name: "John Smith", instrument: "Trumpet" },
        { name: "Sarah Johnson", instrument: "Flute" },
        { name: "Mike Davis", instrument: "Drums" },
        { name: "Emily Wilson", instrument: "Clarinet" },
        { name: "David Brown", instrument: "Saxophone" },
        { name: "Lisa Garcia", instrument: "Trombone" },
        { name: "Ryan Martinez", instrument: "French Horn" },
        { name: "Ashley Lee", instrument: "Piccolo" }
      ]

      for (const student of rosterStudents) {
        await prisma.student.create({ 
          data: {
            ...student,
            source: 'ROSTER'
          }
        })
      }
      console.log(`✅ Seeded ${rosterStudents.length} roster students`)
    }

    await prisma.$disconnect()
    console.log('🎉 Database initialization complete!')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    // Don't throw - let the app start anyway
  }
}