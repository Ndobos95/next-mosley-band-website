// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { donations as donationsTable } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { resolveTenant } from '@/lib/tenancy'
import { getSession, requireAuth, requireRole } from '@/lib/auth-server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    // Only directors and boosters can view donation data
    if (!session?.user || !['DIRECTOR', 'BOOSTER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Director or Booster access required' },
        { status: 403 }
      )
    }

    // t3dotgg pattern: Sync donation data directly from Stripe when needed
    // Get recent checkout sessions that are donations (last 90 days for better coverage)
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60)
    const checkoutSessions = await stripe.checkout.sessions.list({
      created: { gte: ninetyDaysAgo },
      limit: 100
    })
    
    // Filter for donations only
    const donationSessions = checkoutSessions.data.filter(cs => 
      cs.metadata?.type === 'donation' && 
      cs.payment_status === 'paid'
    )
    
    console.log(`💾 Found ${donationSessions.length} donation sessions from Stripe`)
    
    // Step 2: Sync Stripe data TO database (upsert to avoid duplicates)
    for (const cs of donationSessions) {
      try {
        // Check if already exists
        const existing = (
          await db
            .select()
            .from(donationsTable)
            .where(eq(donationsTable.stripePaymentIntentId, cs.payment_intent as string))
            .limit(1)
        )[0]
        
        if (!existing) {
          // Create new donation record
          await db.insert(donationsTable).values({
            id: crypto.randomUUID(),
            tenantId: session.user.tenantId as string, // populated by adapter if available
            parentName: cs.metadata!.donorName,
            parentEmail: cs.metadata!.donorEmail,
            amount: cs.amount_total || 0,
            notes: cs.metadata!.message,
            stripePaymentIntentId: cs.payment_intent as string,
            status: 'COMPLETED',
            isGuest: true,
            userId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          console.log(`✅ Saved donation to database: ${cs.payment_intent}`)
        } else {
          console.log(`⏭️ Donation already exists in database: ${cs.payment_intent}`)
        }
      } catch (error) {
        console.error(`❌ Error saving donation ${cs.payment_intent}:`, error)
      }
    }

    // Step 3: Return database records (source of truth)
    const tenant = await resolveTenant(request)
    const donations = await db
      .select()
      .from(donationsTable)
      .where(eq(donationsTable.tenantId, tenant?.id ?? ''))
      .orderBy(desc(donationsTable.createdAt))

    // Calculate totals
    const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0)
    const totalCount = donations.length

    console.log(`✅ Returning ${donations.length} donations with total of $${(totalAmount / 100).toFixed(2)}`)
    
    return NextResponse.json({
      donations,
      totals: {
        count: totalCount,
        amount: totalAmount // in cents
      }
    })
  } catch (error) {
    console.error('Error fetching donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}