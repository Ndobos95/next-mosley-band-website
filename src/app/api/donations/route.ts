import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/drizzle'
import { donations as donationsTable, userProfiles } from '@/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    // Get the current user session from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, user.id))
      .limit(1)

    if (!profile[0] || !['DIRECTOR', 'BOOSTER'].includes(profile[0].role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Director or Booster access required' },
        { status: 403 }
      )
    }

    // Get tenant from request headers
    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
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
            tenantId: tenantId, // Use the tenantId from request headers
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
    const donations = await db
      .select()
      .from(donationsTable)
      .where(sql`${donationsTable.tenantId} = ${tenantId}::uuid`)
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