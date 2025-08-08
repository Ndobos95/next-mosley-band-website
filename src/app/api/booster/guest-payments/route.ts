// @ts-nocheck
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { students, users, studentParents, studentPaymentEnrollments, paymentCategories, guestPayments } from '@/db/schema'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { resolveTenant, getRequestOrigin } from '@/lib/tenancy'
import { stripe } from '@/lib/stripe'
import { fuzzyMatch } from '@/lib/fuzzy-match'
import { createStripeCustomerForUser } from '@/lib/stripe-cache'
import { z } from 'zod'

const guestCheckoutSchema = z.object({
  parentName: z.string().min(1, 'Parent name is required'),
  parentEmail: z.string().email('Valid email is required'),
  studentName: z.string().min(1, 'Student name is required'),
  categoryId: z.string().min(1, 'Payment category is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  notes: z.string().optional()
})

async function findMatchingStudent(studentName: string) {
  const studentsList = await db
    .select({ id: students.id, name: students.name, instrument: students.instrument })
    .from(students)
    .where(inArray(students.source, ['ROSTER', 'MANUAL']))
  
  let bestMatch = null
  let bestScore = 0
  
  for (const student of studentsList) {
    const score = fuzzyMatch(studentName, student.name)
    if (score > bestScore) {
      bestScore = score
      bestMatch = student
    }
  }
  
  return { student: bestMatch, confidence: bestScore }
}

async function handleHighConfidenceMatch(data: {
  parentName: string
  parentEmail: string
  studentId: string
  categoryId: string
  amount: number
  notes?: string
}) {
  try {
    // Check if parent already has an account
    let user = (
      await db.select().from(users).where(eq(users.email, data.parentEmail)).limit(1)
    )[0]
    
    // If no user exists, create a ghost account
    if (!user) {
      const created = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email: data.parentEmail,
          name: data.parentName,
          isGuestAccount: true,
          emailVerified: false,
          role: 'PARENT',
        } as any)
        .returning()
      user = created[0]
      
      // Create Stripe customer for ghost account
      await createStripeCustomerForUser(user.id)
      console.log(`👻 Created ghost account for ${data.parentEmail}`)
    }
    
    // Check if parent-student relationship exists
    const existingRelationship = (
      await db
        .select()
        .from(studentParents)
        .where(and(eq(studentParents.userId, user.id), eq(studentParents.studentId, data.studentId)))
        .limit(1)
    )[0]
    
    if (!existingRelationship) {
      // Create parent-student relationship
      await db.insert(studentParents).values({
        id: crypto.randomUUID(),
        userId: user.id,
        studentId: data.studentId,
        status: 'ACTIVE',
      } as any)
    }
    
    // Create or find enrollment
    let enrollment = (
      await db
        .select()
        .from(studentPaymentEnrollments)
        .where(and(eq(studentPaymentEnrollments.studentId, data.studentId), eq(studentPaymentEnrollments.categoryId, data.categoryId)))
        .limit(1)
    )[0]
    
    if (!enrollment) {
      const category = (
        await db.select().from(paymentCategories).where(eq(paymentCategories.id, data.categoryId)).limit(1)
      )[0]
      
      if (category) {
        const createdEnrollment = await db
          .insert(studentPaymentEnrollments)
          .values({
            id: crypto.randomUUID(),
            tenantId: tenant.id,
            studentId: data.studentId,
            categoryId: data.categoryId,
            totalOwed: category.fullAmount,
            amountPaid: 0,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()
        enrollment = createdEnrollment[0]
      }
    }
    
    console.log(`✅ Created ghost account and enrollment for high confidence match: ${data.parentEmail} → ${data.studentId}`)
    
  } catch (error) {
    console.error('Error handling high confidence match:', error)
    throw error
  }
}

async function handleLowConfidenceMatch(data: {
  parentName: string
  parentEmail: string
  studentName: string
  categoryId: string
  amount: number
  notes?: string
  matchedStudentId: string | null
  confidence: number
}) {
  try {
    // Store as guest payment for booster review - no enrollment yet
    await db.insert(guestPayments).values({
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      studentName: data.studentName,
      categoryId: data.categoryId,
      amount: data.amount,
      notes: data.notes,
      stripePaymentIntentId: `temp_${Date.now()}`,
      status: 'PENDING',
      matchedStudentId: data.matchedStudentId ?? null,
      resolutionNotes:
        data.confidence > 0.5
          ? `Possible match found with confidence ${(data.confidence * 100).toFixed(1)}%`
          : 'No matching student found',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    console.log(`📋 Stored unmatched guest payment for manual review: ${data.studentName} (confidence: ${(data.confidence * 100).toFixed(1)}%)`)
    
  } catch (error) {
    console.error('Error storing unmatched guest payment:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = guestCheckoutSchema.parse(body)

    const tenant = await resolveTenant(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }
    
    // Verify payment category exists and validate amount
    const category = (
      await db.select().from(paymentCategories).where(eq(paymentCategories.id, validatedData.categoryId)).limit(1)
    )[0]
    
    if (!category || !category.active) {
      return NextResponse.json(
        { error: 'Invalid payment category' },
        { status: 400 }
      )
    }
    
    // Validate payment amount
    if (category.allowIncrements && category.incrementAmount) {
      // Check if amount is valid increment
      if (validatedData.amount % category.incrementAmount !== 0 || 
          validatedData.amount > category.fullAmount) {
        return NextResponse.json(
          { error: 'Invalid payment amount for this category' },
          { status: 400 }
        )
      }
    } else {
      // Must pay full amount
      if (validatedData.amount !== category.fullAmount) {
        return NextResponse.json(
          { error: 'Must pay full amount for this category' },
          { status: 400 }
        )
      }
    }
    
    // Find matching student
    const { student, confidence } = await findMatchingStudent(validatedData.studentName)
    
    let stripeCustomerId: string | undefined
    
    // High confidence match (≥0.8): Create ghost account and enrollment immediately
    if (student && confidence >= 0.8) {
      await handleHighConfidenceMatch({
        parentName: validatedData.parentName,
        parentEmail: validatedData.parentEmail,
        studentId: student.id,
        categoryId: validatedData.categoryId,
        amount: validatedData.amount,
        notes: validatedData.notes
      })
      
      // Get the ghost account's Stripe customer ID for checkout
      const ghostUser = (
        await db.select().from(users).where(eq(users.email, validatedData.parentEmail)).limit(1)
      )[0]
      stripeCustomerId = ghostUser?.stripeCustomerId || undefined
    } else {
      // Low confidence match: Store as unmatched guest payment
      await handleLowConfidenceMatch({
        parentName: validatedData.parentName,
        parentEmail: validatedData.parentEmail,
        studentName: validatedData.studentName,
        categoryId: validatedData.categoryId,
        amount: validatedData.amount,
        notes: validatedData.notes,
        matchedStudentId: student?.id || null,
        confidence
      })
    }
    
    const origin = getRequestOrigin(request)

    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || '0')
    const applicationFeeAmount = Math.floor((validatedData.amount * platformFeeBps) / 10000)
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${category.name} - ${validatedData.studentName}`,
              description: category.description || undefined,
            },
            unit_amount: validatedData.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay`,
      customer: stripeCustomerId, // Use ghost account customer if available
      customer_email: stripeCustomerId ? undefined : validatedData.parentEmail, // Only set email if no customer
      payment_intent_data: tenant.connectedAccountId ? {
        transfer_data: { destination: tenant.connectedAccountId },
        application_fee_amount: applicationFeeAmount,
      } : undefined,
      metadata: {
        type: 'guest_payment',
        parentEmail: validatedData.parentEmail,
        studentName: validatedData.studentName,
        confidence: confidence.toString(),
        tenantSlug: tenant.slug,
      }
    })
    
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Guest checkout error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
  }
}