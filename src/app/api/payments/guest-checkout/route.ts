import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  const studentsList = await prisma.students.findMany({
    where: {
      source: {
        in: ['ROSTER', 'MANUAL']
      }
    },
    select: {
      id: true,
      name: true,
      instrument: true
    }
  })

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
  tenantId: string
}) {
  try {
    // Check if parent already has an account
    let user = await prisma.user_profiles.findFirst({
      where: { email: data.parentEmail }
    })

    // If no user exists, create a ghost account
    if (!user) {
      user = await prisma.user_profiles.create({
        data: {
          id: crypto.randomUUID(),
          email: data.parentEmail,
          display_name: data.parentName,
          role: 'PARENT',
          tenant_id: data.tenantId,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      // Create Stripe customer for ghost account
      await createStripeCustomerForUser(user.id)
      console.log(`👻 Created ghost account for ${data.parentEmail}`)
    }
    
    // Check if parent-student relationship exists
    const existingRelationship = await prisma.student_parents.findFirst({
      where: {
        user_id: user.id,
        student_id: data.studentId
      }
    })

    if (!existingRelationship) {
      // Create parent-student relationship
      await prisma.student_parents.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: data.tenantId,
          user_id: user.id,
          student_id: data.studentId,
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
        }
      })
    }
    
    // Create or find enrollment
    let enrollment = await prisma.student_payment_enrollments.findFirst({
      where: {
        student_id: data.studentId,
        category_id: data.categoryId
      }
    })

    if (!enrollment) {
      const category = await prisma.payment_categories.findUnique({
        where: { id: data.categoryId }
      })

      if (category) {
        enrollment = await prisma.student_payment_enrollments.create({
          data: {
            id: crypto.randomUUID(),
            tenant_id: data.tenantId,
            student_id: data.studentId,
            category_id: data.categoryId,
            total_owed: category.full_amount,
            amount_paid: 0,
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
          }
        })
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
  tenantId: string
}) {
  try {
    // Store as guest payment for booster review - no enrollment yet
    await prisma.guest_payments.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: data.tenantId,
        parent_name: data.parentName,
        parent_email: data.parentEmail,
        student_name: data.studentName,
        category_id: data.categoryId,
        amount: data.amount,
        notes: data.notes,
        stripe_payment_intent_id: `temp_${Date.now()}`,
        status: 'PENDING',
        matched_student_id: data.matchedStudentId ?? null,
        resolution_notes:
          data.confidence > 0.5
            ? `Possible match found with confidence ${(data.confidence * 100).toFixed(1)}%`
            : 'No matching student found',
        created_at: new Date(),
        updated_at: new Date(),
      }
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
    const category = await prisma.payment_categories.findUnique({
      where: { id: validatedData.categoryId }
    })

    if (!category || !category.active) {
      return NextResponse.json(
        { error: 'Invalid payment category' },
        { status: 400 }
      )
    }

    // Validate payment amount
    if (category.allow_increments && category.increment_amount) {
      // Check if amount is valid increment
      if (validatedData.amount % category.increment_amount !== 0 ||
          validatedData.amount > category.full_amount) {
        return NextResponse.json(
          { error: 'Invalid payment amount for this category' },
          { status: 400 }
        )
      }
    } else {
      // Must pay full amount
      if (validatedData.amount !== category.full_amount) {
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
        notes: validatedData.notes,
        tenantId: tenant.id
      })

      // Ghost account was created with stripe customer in handleHighConfidenceMatch
      // For now, let Stripe create a new customer for this checkout session
      stripeCustomerId = undefined
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
        confidence,
        tenantId: tenant.id
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
      // TODO: Enable payment_intent_data when Stripe Connect is implemented
      // payment_intent_data: connectedAccountId ? {
      //   transfer_data: { destination: connectedAccountId },
      //   application_fee_amount: applicationFeeAmount,
      // } : undefined,
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