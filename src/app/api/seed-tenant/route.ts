// @ts-nocheck
import { NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { tenants, paymentCategories } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  try {
    // Insert default tenant
    const [tenant] = await db.insert(tenants).values({
      slug: 'default',
      name: 'Default Band Program'
    }).onConflictDoNothing().returning()

    console.log('✅ Default tenant seeded:', tenant || 'Already exists')
    
    // Get or create tenant first, then use its ID
    const [existingTenant] = await db.select().from(tenants).where(eq(tenants.slug, 'default')).limit(1)
    const tenantId = tenant?.id || existingTenant?.id
    
    if (!tenantId) {
      throw new Error('Failed to create or find default tenant')
    }

    // Insert basic payment categories with tenant ID
    const categories = await db.insert(paymentCategories).values([
      {
        id: 'BAND_FEES',
        tenantId: tenantId,
        name: 'Band Fees',
        description: 'Annual band participation fees',
        fullAmount: 25000,
        allowIncrements: false,
        incrementAmount: null,
      },
      {
        id: 'SPRING_TRIP', 
        tenantId: tenantId,
        name: 'Spring Trip',
        description: 'Spring band trip expenses',
        fullAmount: 90000,
        allowIncrements: true,
        incrementAmount: 5000,
      },
      {
        id: 'EQUIPMENT',
        tenantId: tenantId,
        name: 'Equipment', 
        description: 'Band equipment and supplies',
        fullAmount: 15000,
        allowIncrements: true,
        incrementAmount: 2500,
      }
    ]).onConflictDoNothing().returning()

    return NextResponse.json({
      success: true,
      tenant: tenant || 'exists',
      categories: categories.length || 'exist'
    })

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}