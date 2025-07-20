import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is director or booster
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || !['DIRECTOR', 'BOOSTER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all students with their enrollment and payment data
    const students = await prisma.student.findMany({
      include: {
        parents: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          where: {
            status: 'ACTIVE'
          }
        },
        enrollments: {
          include: {
            category: true,
            payments: {
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        guestPayments: {
          include: {
            category: true
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform data for easier frontend consumption
    const studentsWithPaymentSummary = students.map(student => {
      const enrollmentSummary = student.enrollments.map(enrollment => ({
        category: enrollment.category.name,
        categoryId: enrollment.category.id,
        totalOwed: enrollment.totalOwed,
        amountPaid: enrollment.amountPaid,
        remaining: enrollment.totalOwed - enrollment.amountPaid,
        status: enrollment.status,
        payments: enrollment.payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          parentEmail: payment.parentEmail,
          studentName: payment.studentName,
          notes: payment.notes,
          createdAt: payment.createdAt
        }))
      }));

      const guestPayments = student.guestPayments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        parentName: payment.parentName,
        parentEmail: payment.parentEmail,
        studentName: payment.studentName,
        categoryName: payment.category.name,
        notes: payment.notes,
        createdAt: payment.createdAt,
        isGuest: true
      }));

      const totalOwed = enrollmentSummary.reduce((sum, e) => sum + e.totalOwed, 0);
      const totalPaid = enrollmentSummary.reduce((sum, e) => sum + e.amountPaid, 0);
      const guestPaymentTotal = guestPayments.reduce((sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0), 0);

      return {
        id: student.id,
        name: student.name,
        instrument: student.instrument,
        grade: student.grade,
        source: student.source,
        parents: student.parents.map(sp => ({
          name: sp.user.name,
          email: sp.user.email,
          status: sp.status
        })),
        enrollments: enrollmentSummary,
        guestPayments,
        totalOwed,
        totalPaid: totalPaid + guestPaymentTotal,
        totalRemaining: totalOwed - totalPaid,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
      };
    });

    return NextResponse.json({ 
      students: studentsWithPaymentSummary 
    });

  } catch (error) {
    console.error('Get students payments API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}