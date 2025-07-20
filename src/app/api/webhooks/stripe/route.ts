import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { syncStripeDataToUser } from '@/lib/stripe-cache';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`📥 Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as { id: string; customer: string | null });
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as { id: string; customer: string | null });
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: { id: string; metadata: Record<string, string> | null }) {
  try {
    console.log(`✅ Checkout completed: ${session.id}`);
    
    if (!session.metadata) {
      console.error('No metadata in checkout session');
      return;
    }
    
    const { type, userId } = session.metadata;
    
    if (type === 'guest_payment' && session.metadata) {
      await handleGuestPayment(session as { id: string; metadata: Record<string, string> });
    } else if (userId && session.metadata) {
      // Regular authenticated user payment
      await handleUserPayment(session as { id: string; metadata: Record<string, string> }, userId);
    } else {
      console.error('Unknown payment type or missing userId in checkout session metadata');
    }

  } catch (error) {
    console.error('Error handling checkout completion:', error);
  }
}

async function handleUserPayment(session: { id: string; metadata: Record<string, string> }, userId: string) {
  try {
    // For t3dotgg pattern - just sync the user's Stripe data
    // This will pull all payments and update the cache
    await syncStripeDataToUser(userId);
    
    console.log(`🔄 Synced payment data for user ${userId} after checkout completion`);
    
    // Optional: Log the payment for tracking
    const { studentId, studentName, category, incrementCount, paymentType } = session.metadata;
    console.log(`💰 User payment completed:`, {
      userId,
      studentId,
      studentName,
      category,
      incrementCount,
      paymentType,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error handling user payment:', error);
  }
}

async function handleGuestPayment(session: { id: string; metadata: Record<string, string> }) {
  try {
    const { parentName, parentEmail, studentName, categoryId, categoryName, notes, matchedStudentId, matchConfidence } = session.metadata;
    
    // Get the payment intent to get the amount
    const stripeSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['payment_intent']
    });
    
    const paymentIntent = stripeSession.payment_intent as { id: string; amount: number };
    if (!paymentIntent) {
      console.error('No payment intent found for guest payment session');
      return;
    }
    
    const amount = paymentIntent.amount;
    const confidence = parseFloat(matchConfidence || '0');
    
    // If we have a good match (confidence >= 0.8), link to existing student
    if (matchedStudentId && confidence >= 0.8) {
      await handleMatchedGuestPayment({
        paymentIntentId: paymentIntent.id,
        parentName,
        parentEmail,
        studentName,
        categoryId,
        amount,
        notes,
        matchedStudentId
      });
    } else {
      // Store as unmatched payment for booster review
      await handleUnmatchedGuestPayment({
        paymentIntentId: paymentIntent.id,
        parentName,
        parentEmail,
        studentName,
        categoryId,
        amount,
        notes,
        matchedStudentId: matchedStudentId || null,
        confidence
      });
    }
    
    console.log(`💰 Guest payment completed:`, {
      parentName,
      parentEmail,
      studentName,
      categoryName,
      amount: amount / 100, // Convert to dollars for logging
      matched: confidence >= 0.8,
      sessionId: session.id
    });
    
  } catch (error) {
    console.error('Error handling guest payment:', error);
  }
}

async function handleMatchedGuestPayment(data: {
  paymentIntentId: string;
  parentName: string;
  parentEmail: string;
  studentName: string;
  categoryId: string;
  amount: number;
  notes?: string;
  matchedStudentId: string;
}) {
  try {
    // Check if parent already has an account
    let user = await prisma.user.findUnique({
      where: { email: data.parentEmail }
    });
    
    // If no user exists, create a ghost account
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.parentEmail,
          name: data.parentName,
          isGuestAccount: true,
          emailVerified: false,
          role: 'PARENT'
        }
      });
      
      // Link ghost account to student
      await prisma.studentParent.create({
        data: {
          userId: user.id,
          studentId: data.matchedStudentId,
          status: 'ACTIVE'
        }
      });
      
      console.log(`👻 Created ghost account for ${data.parentEmail} and linked to student ${data.matchedStudentId}`);
    }
    
    // Create or find enrollment
    let enrollment = await prisma.studentPaymentEnrollment.findUnique({
      where: {
        studentId_categoryId: {
          studentId: data.matchedStudentId,
          categoryId: data.categoryId
        }
      }
    });
    
    if (!enrollment) {
      const category = await prisma.paymentCategory.findUnique({
        where: { id: data.categoryId }
      });
      
      if (category) {
        enrollment = await prisma.studentPaymentEnrollment.create({
          data: {
            studentId: data.matchedStudentId,
            categoryId: data.categoryId,
            totalOwed: category.fullAmount,
            amountPaid: 0
          }
        });
      }
    }
    
    if (enrollment) {
      // Create payment record
      await prisma.payment.create({
        data: {
          enrollmentId: enrollment.id,
          categoryId: data.categoryId,
          stripePaymentIntentId: data.paymentIntentId,
          amount: data.amount,
          status: 'COMPLETED',
          notes: data.notes,
          parentEmail: data.parentEmail,
          studentName: data.studentName
        }
      });
      
      // Update enrollment amount paid
      await prisma.studentPaymentEnrollment.update({
        where: { id: enrollment.id },
        data: {
          amountPaid: {
            increment: data.amount
          }
        }
      });
      
      console.log(`✅ Processed matched guest payment for student ${data.matchedStudentId}`);
    }
    
  } catch (error) {
    console.error('Error processing matched guest payment:', error);
  }
}

async function handleUnmatchedGuestPayment(data: {
  paymentIntentId: string;
  parentName: string;
  parentEmail: string;
  studentName: string;
  categoryId: string;
  amount: number;
  notes?: string;
  matchedStudentId: string | null;
  confidence: number;
}) {
  try {
    // Store as guest payment for booster review
    await prisma.guestPayment.create({
      data: {
        parentName: data.parentName,
        parentEmail: data.parentEmail,
        studentName: data.studentName,
        categoryId: data.categoryId,
        amount: data.amount,
        notes: data.notes,
        stripePaymentIntentId: data.paymentIntentId,
        status: 'COMPLETED',
        matchedStudentId: data.matchedStudentId,
        resolutionNotes: data.confidence > 0.5 ? 
          `Possible match found with confidence ${(data.confidence * 100).toFixed(1)}%` : 
          'No matching student found'
      }
    });
    
    console.log(`📋 Stored unmatched guest payment for manual review: ${data.studentName}`);
    
  } catch (error) {
    console.error('Error storing unmatched guest payment:', error);
  }
}

async function handlePaymentSucceeded(paymentIntent: { id: string; customer: string | null }) {
  try {
    console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
    
    const customerId = paymentIntent.customer;
    if (!customerId) {
      console.log('No customer ID in payment intent');
      return;
    }

    // Find user by Stripe customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    // Sync the user's data using t3dotgg pattern
    await syncStripeDataToUser(user.id);
    
    console.log(`🔄 Synced payment data for user ${user.id} after payment success`);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: { id: string; customer: string | null }) {
  try {
    console.log(`❌ Payment failed: ${paymentIntent.id}`);
    
    const customerId = paymentIntent.customer;
    if (!customerId) {
      console.log('No customer ID in failed payment intent');
      return;
    }

    // Find user by Stripe customer ID
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    // Still sync to update the failed payment status
    await syncStripeDataToUser(user.id);
    
    console.log(`🔄 Synced payment data for user ${user.id} after payment failure`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}