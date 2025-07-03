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