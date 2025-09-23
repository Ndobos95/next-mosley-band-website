import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Insert default tenant
    const tenant = await prisma.tenants.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        slug: 'default',
        name: 'Default Band Program'
      }
    })

    console.log('✅ Default tenant seeded:', tenant)

    // Insert basic payment categories with tenant ID
    const categories = await Promise.all([
      prisma.payment_categories.upsert({
        where: {
          tenant_id_name: {
            tenant_id: tenant.id,
            name: 'Band Fees'
          }
        },
        update: {},
        create: {
          id: 'BAND_FEES',
          tenant_id: tenant.id,
          name: 'Band Fees',
          description: 'Required band program fees',
          full_amount: 25000, // $250.00
          allow_increments: false
        }
      }),
      prisma.payment_categories.upsert({
        where: {
          tenant_id_name: {
            tenant_id: tenant.id,
            name: 'Spring Trip'
          }
        },
        update: {},
        create: {
          id: 'SPRING_TRIP',
          tenant_id: tenant.id,
          name: 'Spring Trip',
          description: 'Optional spring performance trip',
          full_amount: 90000, // $900.00
          allow_increments: true,
          increment_amount: 5000 // $50.00
        }
      }),
      prisma.payment_categories.upsert({
        where: {
          tenant_id_name: {
            tenant_id: tenant.id,
            name: 'Equipment'
          }
        },
        update: {},
        create: {
          id: 'EQUIPMENT',
          tenant_id: tenant.id,
          name: 'Equipment',
          description: 'Instrument rental and equipment fees',
          full_amount: 15000, // $150.00
          allow_increments: true,
          increment_amount: 2500 // $25.00
        }
      })
    ])

    console.log('✅ Payment categories seeded:', categories.length)

    return NextResponse.json({
      success: true,
      tenant,
      categories: categories.length
    })
  } catch (error) {
    console.error('❌ Seeding error:', error)
    return NextResponse.json({ error: 'Failed to seed tenant' }, { status: 500 })
  }
}