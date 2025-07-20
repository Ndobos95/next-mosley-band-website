import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { fuzzyMatch } from '@/lib/fuzzy-match'
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay`,
      customer_email: validatedData.parentEmail,
      metadata: {
        type: 'guest_payment',
        parentName: validatedData.parentName,
        parentEmail: validatedData.parentEmail,
        studentName: validatedData.studentName,
        categoryId: validatedData.categoryId,
        categoryName: category.name,
        notes: validatedData.notes || '',
        matchedStudentId: student?.id || '',
        matchConfidence: confidence.toString()
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