import { db } from './src/lib/drizzle'
import { students, tenants } from './src/db/schema'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function seedRiversideStudents() {
  try {
    // Find Riverside tenant
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, 'riverside'))
      .limit(1)

    if (!tenant[0]) {
      console.error('Riverside tenant not found!')
      process.exit(1)
    }

    const tenantId = tenant[0].id
    console.log('Found Riverside tenant:', tenantId)

    // Student roster for Riverside High School Band
    const studentRoster = [
      // Woodwinds
      { name: 'Emily Johnson', instrument: 'Flute' },
      { name: 'Sarah Williams', instrument: 'Flute' },
      { name: 'Jessica Chen', instrument: 'Clarinet' },
      { name: 'Michael Brown', instrument: 'Clarinet' },
      { name: 'Ashley Davis', instrument: 'Alto Saxophone' },
      { name: 'Ryan Martinez', instrument: 'Tenor Saxophone' },
      { name: 'Sophia Anderson', instrument: 'Oboe' },
      
      // Brass
      { name: 'James Wilson', instrument: 'Trumpet' },
      { name: 'Daniel Thompson', instrument: 'Trumpet' },
      { name: 'Matthew Garcia', instrument: 'Trumpet' },
      { name: 'Olivia Lee', instrument: 'French Horn' },
      { name: 'Emma Taylor', instrument: 'Trombone' },
      { name: 'Noah Rodriguez', instrument: 'Trombone' },
      { name: 'Liam Jackson', instrument: 'Tuba' },
      
      // Percussion
      { name: 'Ethan White', instrument: 'Percussion' },
      { name: 'Isabella Harris', instrument: 'Percussion' },
      { name: 'Mason Clark', instrument: 'Percussion' },
      { name: 'Ava Lewis', instrument: 'Percussion' },
      
      // Additional students
      { name: 'Lucas Walker', instrument: 'Baritone' },
      { name: 'Mia Hall', instrument: 'Bassoon' },
      { name: 'Alexander Young', instrument: 'Bass Clarinet' },
      { name: 'Charlotte King', instrument: 'Piccolo' },
      { name: 'Benjamin Wright', instrument: 'Euphonium' },
      { name: 'Amelia Scott', instrument: 'Alto Clarinet' },
      { name: 'William Green', instrument: 'Baritone Saxophone' },
    ]

    // Insert students
    for (const student of studentRoster) {
      const id = `${tenantId}-${student.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      await db.insert(students).values({
        id,
        tenantId,
        name: student.name,
        instrument: student.instrument,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing()
      
      console.log(`Added student: ${student.name} - ${student.instrument}`)
    }

    console.log(`\n✅ Successfully added ${studentRoster.length} students to Riverside High School`)
    process.exit(0)
  } catch (error) {
    console.error('Error seeding students:', error)
    process.exit(1)
  }
}

seedRiversideStudents()