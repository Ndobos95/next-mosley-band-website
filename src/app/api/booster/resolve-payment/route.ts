// @ts-nocheck
// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { guestPayments, students, users, studentParents, studentPaymentEnrollments, payments as paymentsTable, paymentCategories } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth-server'
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
    const guestPayment = (
      await db
        .select({
          id: guestPayments.id,
          parentName: guestPayments.parentName,
          parentEmail: guestPayments.parentEmail,
          studentName: guestPayments.studentName,
          categoryId: guestPayments.categoryId,
          amount: guestPayments.amount,
          notes: guestPayments.notes,
          stripePaymentIntentId: guestPayments.stripePaymentIntentId,
          categoryFullAmount: paymentCategories.fullAmount,
        })
        .from(guestPayments)
        .leftJoin(paymentCategories, eq(guestPayments.categoryId, paymentCategories.id))
        .where(eq(guestPayments.id, validatedData.paymentId))
        .limit(1)
    )[0]

    if (!guestPayment) {
      return NextResponse.json(
        { error: 'Guest payment not found' },
        { status: 404 }
      )
    }

    // Verify the student exists
    const student = (
      await db.select().from(students).where(eq(students.id, validatedData.studentId)).limit(1)
    )[0]

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if parent already has an account
    let user = (
      await db.select().from(users).where(eq(users.email, guestPayment.parentEmail)).limit(1)
    )[0]

    // If no user exists, create a ghost account
    if (!user) {
      const created = await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          email: guestPayment.parentEmail,
          name: guestPayment.parentName,
          isGuestAccount: true,
          emailVerified: false,
          role: 'PARENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      user = created[0]

      console.log(`👻 Created ghost account for ${guestPayment.parentEmail}`)
    }

    // Check if parent-student relationship exists
    const existingRelationship = (
      await db
        .select()
        .from(studentParents)
        .where(and(eq(studentParents.userId, user.id), eq(studentParents.studentId, validatedData.studentId)))
        .limit(1)
    )[0]

    if (!existingRelationship) {
      // Create parent-student relationship
      await db.insert(studentParents).values({
        id: crypto.randomUUID(),
        userId: user.id,
        studentId: validatedData.studentId,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create or find enrollment
    let enrollment = (
      await db
        .select()
        .from(studentPaymentEnrollments)
        .where(and(eq(studentPaymentEnrollments.studentId, validatedData.studentId), eq(studentPaymentEnrollments.categoryId, guestPayment.categoryId)))
        .limit(1)
    )[0]

    if (!enrollment) {
      const createdEnrollment = await db
        .insert(studentPaymentEnrollments)
        .values({
          id: crypto.randomUUID(),
          studentId: validatedData.studentId,
          categoryId: guestPayment.categoryId,
          totalOwed: guestPayment.categoryFullAmount ?? 0,
          amountPaid: 0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
      enrollment = createdEnrollment[0]
    }

    // Create payment record
    await db.insert(paymentsTable).values({
      id: crypto.randomUUID(),
      enrollmentId: enrollment.id,
      categoryId: guestPayment.categoryId,
      stripePaymentIntentId: guestPayment.stripePaymentIntentId,
      amount: guestPayment.amount,
      status: 'COMPLETED',
      notes: guestPayment.notes ?? null,
      parentEmail: guestPayment.parentEmail,
      studentName: guestPayment.studentName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Update enrollment amount paid
    await db
      .update(studentPaymentEnrollments)
      .set({ amountPaid: (enrollment.amountPaid ?? 0) + guestPayment.amount, updatedAt: new Date() })
      .where(eq(studentPaymentEnrollments.id, enrollment.id))

    // Update guest payment with resolution
    await db
      .update(guestPayments)
      .set({
        matchedStudentId: validatedData.studentId,
        matchedUserId: user.id,
        resolutionNotes: validatedData.resolutionNotes || `Manually resolved by booster - matched to ${student.name}`,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(guestPayments.id, validatedData.paymentId))

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