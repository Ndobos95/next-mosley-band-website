// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/drizzle'
import { paymentCategories, studentPaymentEnrollments, payments } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { resolveTenant } from '@/lib/tenancy'
import { PAYMENT_CATEGORIES } from '@/types/stripe'

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const tenant = await resolveTenant(req)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    // Destination charges: objects are on the platform account
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ['payment_intent'] }
    )

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ ok: false, status: session.payment_status })
    }

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    const metadata = session.metadata || {}

    // Default: handle authenticated student payments created by /payments/create-checkout
    if (metadata.paymentType === 'student_payment' && metadata.studentId && metadata.category) {
      const studentId = metadata.studentId as string
      const categoryKey = metadata.category as keyof typeof PAYMENT_CATEGORIES
      const amount = session.amount_total ?? 0

      const categoryName = PAYMENT_CATEGORIES[categoryKey]?.name
      if (!categoryName) {
        return NextResponse.json({ error: 'Invalid category in metadata' }, { status: 400 })
      }

      const categoryRows = await db
        .select()
        .from(paymentCategories)
        .where(and(eq(paymentCategories.name, categoryName), eq(paymentCategories.tenantId, tenant.id)))
        .limit(1)
      const category = categoryRows[0]
      if (!category) {
        return NextResponse.json({ error: 'Payment category not found' }, { status: 404 })
      }

      const enrollmentRows = await db
        .select()
        .from(studentPaymentEnrollments)
        .where(and(eq(studentPaymentEnrollments.tenantId, tenant.id), eq(studentPaymentEnrollments.studentId, studentId), eq(studentPaymentEnrollments.categoryId, category.id)))
        .limit(1)
      let enrollment = enrollmentRows[0]

      if (!enrollment) {
        const created = await db
          .insert(studentPaymentEnrollments)
          .values({
            tenantId: tenant.id,
            studentId,
            categoryId: category.id,
            totalOwed: PAYMENT_CATEGORIES[categoryKey].totalAmount,
            amountPaid: amount || 0,
            status: 'ACTIVE',
          })
          .returning()
        enrollment = created[0]
      } else {
        const newAmountPaid = Math.min(enrollment.totalOwed, enrollment.amountPaid + (amount || 0))
        await db
          .update(studentPaymentEnrollments)
          .set({ amountPaid: newAmountPaid })
          .where(eq(studentPaymentEnrollments.id, enrollment.id))
      }

      // Upsert Payment record for auditability
      if (paymentIntentId) {
        await db
          .insert(payments)
          .values({
            tenantId: tenant.id,
            enrollmentId: enrollment.id,
            stripePaymentIntentId: paymentIntentId,
            amount: amount || 0,
            status: 'PAID',
            parentEmail: metadata.userEmail || '',
            studentName: metadata.studentName || '',
            categoryId: category.id,
            emailSent: false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: payments.stripePaymentIntentId,
            set: {
              status: 'PAID',
              amount: amount || 0,
              updatedAt: new Date(),
            },
          })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('verify-session error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
