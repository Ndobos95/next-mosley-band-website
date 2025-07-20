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

  // Seed payment categories (as specified in CLAUDE.md)
  const paymentCategories = [
    {
      name: "Band Fees",
      description: "Annual band program fees",
      fullAmount: 25000, // $250.00 in cents
      allowIncrements: false,
      incrementAmount: null
    },
    {
      name: "Spring Trip",
      description: "Annual spring trip costs",
      fullAmount: 90000, // $900.00 in cents
      allowIncrements: true,
      incrementAmount: 5000 // $50.00 increments
    },
    {
      name: "Equipment",
      description: "Band equipment and supplies",
      fullAmount: 15000, // $150.00 in cents
      allowIncrements: true,
      incrementAmount: 2500 // $25.00 increments
    }
  ]

  for (const category of paymentCategories) {
    await prisma.paymentCategory.create({
      data: category
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

  // Create special "General Fund" student for donations
  await prisma.student.create({
    data: {
      name: "General Fund",
      instrument: "N/A",
      source: 'MANUAL'
    }
  })

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