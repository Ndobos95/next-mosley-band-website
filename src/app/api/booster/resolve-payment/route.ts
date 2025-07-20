import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const resolvePaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  resolutionNotes: z.string().optional()
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = resolvePaymentSchema.parse(body)

    // Get the guest payment
    const guestPayment = await prisma.guestPayment.findUnique({
      where: { id: validatedData.paymentId },
      include: { category: true }
    })

    if (!guestPayment) {
      return NextResponse.json(
        { error: 'Guest payment not found' },
        { status: 404 }
      )
    }

    // Verify the student exists
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if parent already has an account
    let user = await prisma.user.findUnique({
      where: { email: guestPayment.parentEmail }
    })

    // If no user exists, create a ghost account
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: guestPayment.parentEmail,
          name: guestPayment.parentName,
          isGuestAccount: true,
          emailVerified: false,
          role: 'PARENT'
        }
      })

      console.log(`👻 Created ghost account for ${guestPayment.parentEmail}`)
    }

    // Check if parent-student relationship exists
    const existingRelationship = await prisma.studentParent.findUnique({
      where: {
        userId_studentId: {
          userId: user.id,
          studentId: validatedData.studentId
        }
      }
    })

    if (!existingRelationship) {
      // Create parent-student relationship
      await prisma.studentParent.create({
        data: {
          userId: user.id,
          studentId: validatedData.studentId,
          status: 'ACTIVE'
        }
      })
    }

    // Create or find enrollment
    let enrollment = await prisma.studentPaymentEnrollment.findUnique({
      where: {
        studentId_categoryId: {
          studentId: validatedData.studentId,
          categoryId: guestPayment.categoryId
        }
      }
    })

    if (!enrollment) {
      enrollment = await prisma.studentPaymentEnrollment.create({
        data: {
          studentId: validatedData.studentId,
          categoryId: guestPayment.categoryId,
          totalOwed: guestPayment.category.fullAmount,
          amountPaid: 0
        }
      })
    }

    // Create payment record
    await prisma.payment.create({
      data: {
        enrollmentId: enrollment.id,
        categoryId: guestPayment.categoryId,
        stripePaymentIntentId: guestPayment.stripePaymentIntentId,
        amount: guestPayment.amount,
        status: 'COMPLETED',
        notes: guestPayment.notes,
        parentEmail: guestPayment.parentEmail,
        studentName: guestPayment.studentName
      }
    })

    // Update enrollment amount paid
    await prisma.studentPaymentEnrollment.update({
      where: { id: enrollment.id },
      data: {
        amountPaid: {
          increment: guestPayment.amount
        }
      }
    })

    // Update guest payment with resolution
    await prisma.guestPayment.update({
      where: { id: validatedData.paymentId },
      data: {
        matchedStudentId: validatedData.studentId,
        matchedUserId: user.id,
        resolutionNotes: validatedData.resolutionNotes || `Manually resolved by booster - matched to ${student.name}`,
        resolvedAt: new Date()
      }
    })

    console.log(`✅ Resolved guest payment ${validatedData.paymentId} for student ${student.name}`)

    return NextResponse.json({ 
      success: true, 
      message: `Payment successfully matched to ${student.name}` 
    })

  } catch (error) {
    console.error('Error resolving guest payment:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to resolve payment' },
      { status: 500 }
    )
  }
}