import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
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
    // Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
    const sp = await prisma.student_parents.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: user.id,
        student_id: studentId,
        status: 'ACTIVE',
        deleted_at: null,
      }
    });

    if (!sp) {
      return NextResponse.json({
        error: 'Student not found or not authorized for this parent'
      }, { status: 404 });
    }

    // Get student name
    const student = await prisma.students.findUnique({
      where: { id: studentId },
      select: { name: true }
    });

    if (!student) {
      return NextResponse.json({
        error: 'Student not found'
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

    // Get user profile
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: user.id }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get or create Stripe customer (stored in stripe_cache)
    const stripeCache = await prisma.stripe_cache.findUnique({
      where: { user_id: user.id }
    });

    let stripeCustomerId: string | undefined;
    if (stripeCache && stripeCache.data) {
      const cacheData = stripeCache.data as any;
      stripeCustomerId = cacheData.customerId;
    }

    if (!stripeCustomerId) {
      stripeCustomerId = await createStripeCustomerForUser(user.id);
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
              name: `${categoryConfig.name} - ${student.name}`,
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
        userId: user.id,
        userEmail: userProfile.email,
        studentId: studentId,
        studentName: student.name,
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