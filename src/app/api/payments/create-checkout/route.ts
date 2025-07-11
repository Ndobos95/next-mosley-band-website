import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const body: CheckoutRequest = await request.json();
    const { studentId, category, incrementCount = 1 } = body;

    if (!studentId || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, category' 
      }, { status: 400 });
    }

    // Verify the student-parent relationship exists and is active
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        student: true
      }
    });

    if (!studentParent) {
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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

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

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${categoryConfig.name} - ${studentParent.student.name}`,
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
      metadata: {
        userId: session.user.id,
        studentId: studentId,
        studentName: studentParent.student.name,
        category: category,
        incrementCount: incrementCount.toString(),
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