import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user || session.user.role !== 'BOOSTER') {
      return NextResponse.json(
        { error: 'Unauthorized - Booster access required' },
        { status: 403 }
      )
    }

    // t3dotgg pattern: Sync guest payments directly from Stripe when needed
    // Get recent checkout sessions that are guest payments (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)
    const checkoutSessions = await stripe.checkout.sessions.list({
      created: { gte: thirtyDaysAgo },
      limit: 100
    })
    
    // Filter for guest payments only
    const guestSessions = checkoutSessions.data.filter(cs => 
      cs.metadata?.type === 'guest_payment' && 
      cs.payment_status === 'paid'
    )
    
    // Step 2: Sync Stripe data TO database (upsert to avoid duplicates)
    console.log('💾 Syncing guest payments to database...')
    
    for (const cs of guestSessions) {
      try {
        // Check if already exists
        const existing = await prisma.guestPayment.findFirst({
          where: { stripePaymentIntentId: cs.payment_intent as string }
        })
        
        if (!existing) {
          // Create new record
          await prisma.guestPayment.create({
            data: {
              parentName: cs.metadata!.parentName,
              parentEmail: cs.metadata!.parentEmail,
              studentName: cs.metadata!.studentName,
              categoryId: cs.metadata!.categoryId,
              amount: cs.amount_total || 0,
              notes: cs.metadata!.notes || null,
              stripePaymentIntentId: cs.payment_intent as string,
              status: 'COMPLETED',
              matchedStudentId: cs.metadata!.matchedStudentId || null,
              resolutionNotes: cs.metadata!.matchConfidence ? 
                `Match confidence: ${(parseFloat(cs.metadata!.matchConfidence) * 100).toFixed(1)}%` : 
                'No matching student found'
            }
          })
          console.log(`✅ Saved guest payment to database: ${cs.payment_intent}`)
        } else {
          console.log(`⏭️ Guest payment already exists in database: ${cs.payment_intent}`)
        }
      } catch (error) {
        console.error(`❌ Error saving guest payment ${cs.payment_intent}:`, error)
      }
    }

    // Step 3: Return database records (source of truth)
    console.log('📖 Reading guest payments from database...')
    const guestPayments = await prisma.guestPayment.findMany({
      include: {
        category: {
          select: {
            name: true,
            description: true
          }
        },
        matchedStudent: {
          select: {
            id: true,
            name: true,
            instrument: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Final database guest payments: ${guestPayments.length}`)
    console.log('📤 Returning guest payments from database to booster dashboard:', guestPayments.map(gp => ({
      id: gp.id,
      parentName: gp.parentName,
      studentName: gp.studentName,
      amount: gp.amount,
      category: gp.category?.name
    })))
    
    return NextResponse.json(guestPayments)
  } catch (error) {
    console.error('Error fetching guest payments from Stripe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guest payments' },
      { status: 500 }
    )
  }
}