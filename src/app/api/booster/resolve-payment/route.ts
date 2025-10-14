import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const resolvePaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  resolutionNotes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const profile = await prisma.user_profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!profile || profile.role !== 'BOOSTER') {
      return NextResponse.json(
        { error: 'Unauthorized - Booster access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = resolvePaymentSchema.parse(body)

    // Get the guest payment with category data
    const guestPayment = await prisma.guest_payments.findUnique({
      where: { id: validatedData.paymentId }
    })

    if (!guestPayment) {
      return NextResponse.json(
        { error: 'Guest payment not found' },
        { status: 404 }
      )
    }

    // Get category data
    const category = await prisma.payment_categories.findUnique({
      where: { id: guestPayment.category_id }
    })

    // Verify the student exists
    const student = await prisma.students.findUnique({
      where: { id: validatedData.studentId }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if parent already has an account
    let userProfile = await prisma.user_profiles.findFirst({
      where: { email: guestPayment.parent_email }
    })

    // If no user exists, create a ghost account
    if (!userProfile) {
      userProfile = await prisma.user_profiles.create({
        data: {
          id: crypto.randomUUID(),
          email: guestPayment.parent_email,
          display_name: guestPayment.parent_name,
          role: 'PARENT',
          tenant_id: student.tenant_id,
          created_at: new Date(),
          updated_at: new Date()
        }
      })

      console.log(`👻 Created ghost account for ${guestPayment.parent_email}`)
    }

    // Check if parent-student relationship exists
    const existingRelationship = await prisma.student_parents.findFirst({
      where: {
        user_id: userProfile.id,
        student_id: validatedData.studentId
      }
    })

    if (!existingRelationship) {
      // Create parent-student relationship
      await prisma.student_parents.create({
        data: {
          id: crypto.randomUUID(),
          user_id: userProfile.id,
          student_id: validatedData.studentId,
          tenant_id: student.tenant_id,
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    }

    // Create or find enrollment
    let enrollment = await prisma.student_payment_enrollments.findFirst({
      where: {
        student_id: validatedData.studentId,
        category_id: guestPayment.category_id
      }
    })

    if (!enrollment) {
      enrollment = await prisma.student_payment_enrollments.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: student.tenant_id,
          student_id: validatedData.studentId,
          category_id: guestPayment.category_id,
          total_owed: category?.full_amount ?? 0,
          amount_paid: 0,
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date()
        }
      })
    }

    // Create payment record
    await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: student.tenant_id,
        enrollment_id: enrollment.id,
        category_id: guestPayment.category_id,
        stripe_payment_intent_id: guestPayment.stripe_payment_intent_id,
        amount: guestPayment.amount,
        status: 'COMPLETED',
        notes: guestPayment.notes,
        parent_email: guestPayment.parent_email,
        student_name: guestPayment.student_name,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // Update enrollment amount paid
    await prisma.student_payment_enrollments.update({
      where: { id: enrollment.id },
      data: {
        amount_paid: (enrollment.amount_paid ?? 0) + guestPayment.amount,
        updated_at: new Date()
      }
    })

    // Update guest payment with resolution
    await prisma.guest_payments.update({
      where: { id: validatedData.paymentId },
      data: {
        matched_student_id: validatedData.studentId,
        matched_user_id: userProfile.id,
        resolution_notes: validatedData.resolutionNotes || `Manually resolved by booster - matched to ${student.name}`,
        resolved_at: new Date(),
        updated_at: new Date()
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