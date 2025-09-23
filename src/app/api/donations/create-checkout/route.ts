// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'


import { z } from 'zod'
import { resolveTenant, getRequestOrigin } from '@/lib/tenancy'

const donationSchema = z.object({
  donorName: z.string().min(1, 'Donor name is required'),
  donorEmail: z.string().email('Valid email is required'),
  organization: z.string().optional().nullable(),
  amount: z.number().min(100, 'Minimum donation is $1').max(1000000, 'Maximum donation is $10,000'), // in cents
  message: z.string().min(1, 'Message is required')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = donationSchema.parse(body)

    const tenant = await resolveTenant(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Find the General Fund student record
    const generalFundStudent = (
      await db
        .select()
        .from(students)
        .where(and(eq(students.name, 'General Fund'), eq(students.tenantId, tenant.id)))
        .limit(1)
    )[0]

    if (!generalFundStudent) {
      console.error('❌ General Fund student record not found')
      return NextResponse.json(
        { error: 'System configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const origin = getRequestOrigin(request)

    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || '0')
    const applicationFeeAmount = Math.floor((validatedData.amount * platformFeeBps) / 10000)

    // Create Stripe Checkout Session for donation
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Band Program Donation',
              description: validatedData.organization 
                ? `Donation from ${validatedData.donorName} (${validatedData.organization})`
                : `Donation from ${validatedData.donorName}`,
            },
            unit_amount: validatedData.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate?cancelled=true`,
      customer_email: validatedData.donorEmail,
      payment_intent_data: tenant.connectedAccountId ? {
        transfer_data: { destination: tenant.connectedAccountId },
        application_fee_amount: applicationFeeAmount,
      } : undefined,
      metadata: {
        type: 'donation',
        donorName: validatedData.donorName,
        donorEmail: validatedData.donorEmail,
        organization: validatedData.organization || '',
        message: validatedData.message,
        generalFundStudentId: generalFundStudent.id,
        tenantSlug: tenant.slug,
      },
    })

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id
    })

  } catch (error) {
    console.error('❌ Error creating donation checkout:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create donation checkout. Please try again.' },
      { status: 500 }
    )
  }
}