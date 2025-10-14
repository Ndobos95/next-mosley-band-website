import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { syncStripeDataToUser } from '@/lib/stripe-cache';

export async function GET(request: NextRequest) {
  try {
    // Get the current user session from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is director or booster
    const profile = await prisma.user_profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!profile || !['DIRECTOR', 'BOOSTER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get tenant from request headers
    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Get users with Stripe data
    const usersWithStripeData = await prisma.stripe_cache.findMany({
      select: { user_id: true }
    });

    // Sync payment data for all users in parallel
    await Promise.allSettled(
      usersWithStripeData.map(u => syncStripeDataToUser(u.user_id))
    );

    // Get all students for this tenant
    const studentRows = await prisma.students.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' }
    });

    // Get parent relationships
    const parentRows = await prisma.student_parents.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE'
      }
    });

    // Get user profiles for parents
    const parentUserIds = parentRows.map(p => p.user_id);
    const userProfiles = await prisma.user_profiles.findMany({
      where: {
        id: { in: parentUserIds }
      }
    });
    const userMap = new Map(userProfiles.map(u => [u.id, u]));

    // Get enrollments
    const enrollmentRows = await prisma.student_payment_enrollments.findMany({
      where: { tenant_id: tenantId }
    });

    // Get payment categories
    const categoryIds = enrollmentRows.map(e => e.category_id);
    const categories = await prisma.payment_categories.findMany({
      where: {
        id: { in: categoryIds }
      }
    });
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Get payments
    const paymentRows = await prisma.payments.findMany({
      where: { tenant_id: tenantId }
    });

    // Get guest payments
    const guestPaymentRows = await prisma.guest_payments.findMany({
      where: { tenant_id: tenantId }
    });

    // Build student payment overview
    const studentsWithPayments = studentRows.map(student => {
      const parent = parentRows.find(p => p.student_id === student.id);
      const parentProfile = parent ? userMap.get(parent.user_id) : null;

      const enrollments = enrollmentRows.filter(e => e.student_id === student.id);
      const enrollmentIds = enrollments.map(e => e.id);
      const payments = paymentRows.filter(p => enrollmentIds.includes(p.enrollment_id));

      // Guest payments that have been matched to this student
      const matchedGuestPayments = guestPaymentRows.filter(gp =>
        gp.matched_student_id === student.id &&
        gp.resolved_at &&
        gp.status === 'COMPLETED'
      );

      const totalOwed = enrollments.reduce((sum, e) => sum + e.total_owed, 0);
      const totalPaid = enrollments.reduce((sum, e) => sum + e.amount_paid, 0);

      return {
        id: student.id,
        name: student.name,
        instrument: student.instrument,
        parentName: parentProfile?.display_name || null,
        parentEmail: parentProfile?.email || null,
        status: parent?.status || 'UNLINKED',
        enrollments: enrollments.map(e => {
          const category = categoryMap.get(e.category_id);
          return {
            category: category?.name || 'Unknown',
            totalOwed: e.total_owed,
            amountPaid: e.amount_paid,
            status: e.status,
          };
        }),
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          notes: p.notes,
          parentEmail: p.parent_email,
          studentName: p.student_name,
          createdAt: p.created_at,
        })),
        guestPayments: matchedGuestPayments.map(gp => ({
          id: gp.id,
          amount: gp.amount,
          status: gp.status,
          parentName: gp.parent_name,
          parentEmail: gp.parent_email,
          notes: gp.notes,
          createdAt: gp.created_at,
        })),
        totalOwed,
        totalPaid,
      };
    });

    return NextResponse.json({ students: studentsWithPayments });
  } catch (error) {
    console.error('Get students payments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}