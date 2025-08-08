import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from './src/lib/drizzle'
import { tenants, paymentCategories } from './src/db/schema'

async function seedTenant() {
  try {
    // Insert default tenant
    const [tenant] = await db.insert(tenants).values({
      slug: 'default',
      name: 'Default Band Program'
    }).onConflictDoNothing().returning()

    console.log('✅ Default tenant seeded:', tenant || 'Already exists')
    
    // Also seed basic payment categories
    const categories = await db.insert(paymentCategories).values([
      {
        id: 'BAND_FEES',
        name: 'Band Fees',
        description: 'Annual band participation fees',
        fullAmount: 25000,
        allowIncrements: false,
        incrementAmount: null,
      },
      {
        id: 'SPRING_TRIP', 
        name: 'Spring Trip',
        description: 'Spring band trip expenses',
        fullAmount: 90000,
        allowIncrements: true,
        incrementAmount: 5000,
      },
      {
        id: 'EQUIPMENT',
        name: 'Equipment', 
        description: 'Band equipment and supplies',
        fullAmount: 15000,
        allowIncrements: true,
        incrementAmount: 2500,
      }
    ]).onConflictDoNothing().returning()

    console.log('✅ Payment categories seeded:', categories.length || 'Already exist')

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedTenant().then(() => {
  console.log('🎉 Database seeding completed')
  process.exit(0)
})