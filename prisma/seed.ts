import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create sample messages
  const messages = [
    { content: 'Welcome to the band program website!' },
    { content: 'This is a test message to verify SQLite persistence.' },
    { content: 'Container restarts should preserve this data.' },
    { content: 'Hello from the seeded database!' }
  ]

  for (const message of messages) {
    await prisma.message.create({
      data: message
    })
  }

  // Seed director's roster (mock data for testing)
  const rosterStudents = [
    { name: "John Smith", instrument: "Trumpet" },
    { name: "Sarah Johnson", instrument: "Flute" },
    { name: "Mike Davis", instrument: "Percussion" },
    { name: "Emily Wilson", instrument: "Clarinet" },
    { name: "David Brown", instrument: "Saxophone" },
    { name: "Lisa Garcia", instrument: "Trombone" },
    { name: "Ryan Martinez", instrument: "French Horn" },
    { name: "Ashley Lee", instrument: "Piccolo" }
  ]

  for (const student of rosterStudents) {
    await prisma.student.create({
      data: {
        name: student.name,
        instrument: student.instrument,
        source: 'ROSTER'
      }
    })
  }

  console.log('Seeding completed.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })