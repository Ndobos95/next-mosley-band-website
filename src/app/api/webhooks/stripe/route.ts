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
    
    const { userId, studentId, studentName, category, incrementCount, paymentType } = session.metadata;
    
    if (!userId) {
      console.error('No userId in checkout session metadata');
      return;
    }

    // For t3dotgg pattern - just sync the user's Stripe data
    // This will pull all payments and update the cache
    await syncStripeDataToUser(userId);
    
    console.log(`🔄 Synced payment data for user ${userId} after checkout completion`);
    
    // Optional: Log the payment for tracking
    console.log(`💰 Payment completed:`, {
      userId,
      studentId,
      studentName,
      category,
      incrementCount,
      paymentType,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error handling checkout completion:', error);
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