import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
  const students = await prisma.student.findMany({
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
  
  for (const student of students) {
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
    let user = await prisma.user.findUnique({
      where: { email: data.parentEmail }
    })
    
    // If no user exists, create a ghost account
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.parentEmail,
          name: data.parentName,
          isGuestAccount: true,
          emailVerified: false,
          role: 'PARENT'
        }
      })
      
      // Create Stripe customer for ghost account
      await createStripeCustomerForUser(user.id)
      console.log(`👻 Created ghost account for ${data.parentEmail}`)
    }
    
    // Check if parent-student relationship exists
    const existingRelationship = await prisma.studentParent.findUnique({
      where: {
        userId_studentId: {
          userId: user.id,
          studentId: data.studentId
        }
      }
    })
    
    if (!existingRelationship) {
      // Create parent-student relationship
      await prisma.studentParent.create({
        data: {
          userId: user.id,
          studentId: data.studentId,
          status: 'ACTIVE'
        }
      })
    }
    
    // Create or find enrollment
    let enrollment = await prisma.studentPaymentEnrollment.findUnique({
      where: {
        studentId_categoryId: {
          studentId: data.studentId,
          categoryId: data.categoryId
        }
      }
    })
    
    if (!enrollment) {
      const category = await prisma.paymentCategory.findUnique({
        where: { id: data.categoryId }
      })
      
      if (category) {
        enrollment = await prisma.studentPaymentEnrollment.create({
          data: {
            studentId: data.studentId,
            categoryId: data.categoryId,
            totalOwed: category.fullAmount,
            amountPaid: 0  // Will be updated when payment syncs
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
}) {
  try {
    // Store as guest payment for booster review - no enrollment yet
    await prisma.guestPayment.create({
      data: {
        parentName: data.parentName,
        parentEmail: data.parentEmail,
        studentName: data.studentName,
        categoryId: data.categoryId,
        amount: data.amount,
        notes: data.notes,
        stripePaymentIntentId: `temp_${Date.now()}`, // Placeholder, will be updated when payment completes
        status: 'PENDING',
        matchedStudentId: data.matchedStudentId,
        resolutionNotes: data.confidence > 0.5 ? 
          `Possible match found with confidence ${(data.confidence * 100).toFixed(1)}%` : 
          'No matching student found'
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
    
    // Verify payment category exists and validate amount
    const category = await prisma.paymentCategory.findUnique({
      where: { id: validatedData.categoryId }
    })
    
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
      const ghostUser = await prisma.user.findUnique({
        where: { email: validatedData.parentEmail }
      })
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay`,
      customer: stripeCustomerId, // Use ghost account customer if available
      customer_email: stripeCustomerId ? undefined : validatedData.parentEmail, // Only set email if no customer
      metadata: {
        type: 'guest_payment',
        parentEmail: validatedData.parentEmail,
        studentName: validatedData.studentName,
        confidence: confidence.toString()
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