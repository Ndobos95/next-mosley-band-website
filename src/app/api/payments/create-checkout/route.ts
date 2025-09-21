// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { db } from '@/lib/drizzle';
import { studentParents, users, students } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { resolveTenant, getRequestOrigin } from '@/lib/tenancy'
import { stripe } from '@/lib/stripe';
import { createStripeCustomerForUser } from '@/lib/stripe-cache';
import { PAYMENT_CATEGORIES, type PaymentCategory } from '@/types/stripe';

interface CheckoutRequest {
  studentId: string;
  category: PaymentCategory;
  incrementCount?: number; // For incremental payments (e.g., 2 = 2 x $50 for Spring Trip)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await resolveTenant(request)
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 })
    }

    const body: CheckoutRequest = await request.json();
    const { studentId, category, incrementCount = 1 } = body;

    if (!studentId || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, category' 
      }, { status: 400 });
    }

    // Verify the student-parent relationship exists and is active
    const sp = (
      await db
        .select({
          id: studentParents.id,
          status: studentParents.status,
          createdAt: studentParents.createdAt,
          studentId: studentParents.studentId,
          studentName: students.name,
        })
        .from(studentParents)
        .leftJoin(students, eq(studentParents.studentId, students.id))
        .where(
          and(
            eq(studentParents.tenantId, tenant.id),
            eq(studentParents.userId, session.user.id),
            eq(studentParents.studentId, studentId),
            eq(studentParents.status, 'ACTIVE'),
            isNull(studentParents.deletedAt),
          ),
        )
        .limit(1)
    )[0];

    if (!sp) {
      return NextResponse.json({ 
        error: 'Student not found or not authorized for this parent' 
      }, { status: 404 });
    }

    // Get category configuration
    const categoryConfig = PAYMENT_CATEGORIES[category];
    if (!categoryConfig) {
      return NextResponse.json({ 
        error: 'Invalid payment category' 
      }, { status: 400 });
    }

    // Calculate payment amount
    const paymentAmount = categoryConfig.increment * incrementCount;
    
    // Validate increment count
    if (paymentAmount > categoryConfig.totalAmount) {
      return NextResponse.json({ 
        error: 'Payment amount exceeds category total' 
      }, { status: 400 });
    }

    // Get or create Stripe customer
    const user = (
      await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
    )[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomerForUser(session.user.id);
      if (!stripeCustomerId) {
        return NextResponse.json({ 
          error: 'Failed to create payment account' 
        }, { status: 500 });
      }
    }

    const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || '0')
    const applicationFeeAmount = Math.floor((paymentAmount * platformFeeBps) / 10000)

    const origin = getRequestOrigin(request)

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${categoryConfig.name} - ${sp.studentName}`,
              description: incrementCount > 1 
                ? `Payment ${incrementCount} x $${(categoryConfig.increment / 100).toFixed(2)}`
                : `Payment for ${categoryConfig.name}`,
            },
            unit_amount: categoryConfig.increment,
          },
          quantity: incrementCount,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      payment_intent_data: tenant.connectedAccountId ? {
        transfer_data: { destination: tenant.connectedAccountId },
        application_fee_amount: applicationFeeAmount,
      } : undefined,
      metadata: {
        userId: session.user.id,
        userEmail: user.email,
        studentId: studentId,
        studentName: sp.studentName,
        category: category,
        incrementCount: incrementCount.toString(),
        tenantSlug: tenant.slug,
        paymentType: 'student_payment'
      },
    });

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}