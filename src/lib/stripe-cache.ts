// Helper functions for working with Stripe cache (t3dotgg pattern)

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import type { StripeCustomerCache, PaymentTotals, StripePaymentData } from '@/types/stripe';

/**
 * Get user's Stripe cache data (single source of truth)
 */
export async function getUserStripeData(userId: string): Promise<StripeCustomerCache | null> {
  const cache = await prisma.stripeCache.findUnique({
    where: { userId }
  });
  
  if (!cache) return null;
  
  // Type assertion - we control the shape through syncStripeDataToUser
  return cache.data as unknown as StripeCustomerCache;
}

/**
 * Helper to get payment totals for a user
 */
export async function getUserPaymentTotals(userId: string): Promise<PaymentTotals> {
  const stripeData = await getUserStripeData(userId);
  
  return stripeData?.totals ?? {
    bandFeesPaid: 0,
    tripPaid: 0,
    equipmentPaid: 0,
    donationsPaid: 0
  };
}

/**
 * Helper to get payment history for a user
 */
export async function getUserPaymentHistory(userId: string) {
  const stripeData = await getUserStripeData(userId);
  return stripeData?.payments ?? [];
}

/**
 * Helper to calculate outstanding balances
 */
export async function getUserOutstandingBalances(userId: string) {
  const totals = await getUserPaymentTotals(userId);
  
  return {
    bandFeesOwed: Math.max(0, 25000 - totals.bandFeesPaid), // $250
    tripOwed: Math.max(0, 90000 - totals.tripPaid),         // $900  
    equipmentOwed: Math.max(0, 15000 - totals.equipmentPaid) // $150
  };
}

/**
 * Create Stripe customer for new user (t3dotgg pattern)
 * Called during user registration
 */
export async function createStripeCustomerForUser(userId: string): Promise<string | null> {
  try {
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error(`User ${userId} not found`);
      return null;
    }
    
    if (user.stripeCustomerId) {
      console.log(`User ${userId} already has Stripe customer: ${user.stripeCustomerId}`);
      return user.stripeCustomerId;
    }
    
    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: userId,
        role: user.role
      }
    });
    
    // Update user with customer ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id }
    });
    
    console.log(`✅ Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;
    
  } catch (error) {
    console.error(`❌ Failed to create Stripe customer for user ${userId}:`, error);
    return null;
  }
}

/**
 * Core t3dotgg sync function - Single source of truth for Stripe data
 * Fetches ALL customer data from Stripe and caches it in database
 */
export async function syncStripeDataToUser(userId: string): Promise<StripeCustomerCache | null> {
  try {
    // 1. Get user and their Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.stripeCustomerId) {
      console.log(`User ${userId} has no Stripe customer ID`);
      return null;
    }
    
    // 2. Fetch ALL customer data from Stripe API
    const [customer, paymentIntents] = await Promise.all([
      stripe.customers.retrieve(user.stripeCustomerId),
      stripe.paymentIntents.list({
        customer: user.stripeCustomerId,
        limit: 100 // Adjust as needed
      })
    ]);
    
    if (customer.deleted) {
      console.log(`Stripe customer ${user.stripeCustomerId} was deleted`);
      return null;
    }
    
    // 3. Transform payment data into our format
    const payments: StripePaymentData[] = paymentIntents.data.map(pi => ({
      id: pi.id,
      amount: pi.amount,
      status: pi.status as StripePaymentData['status'],
      created: pi.created,
      description: pi.description || '',
      metadata: {
        studentName: pi.metadata.studentName,
        category: pi.metadata.category as StripePaymentData['metadata']['category'],
        increment: pi.metadata.increment,
        notes: pi.metadata.notes
      }
    }));
    
    // 4. Calculate totals by category
    const totals: PaymentTotals = {
      bandFeesPaid: 0,
      tripPaid: 0,
      equipmentPaid: 0,
      donationsPaid: 0
    };
    
    payments.forEach(payment => {
      if (payment.status === 'succeeded') {
        switch (payment.metadata.category) {
          case 'Band Fees':
            totals.bandFeesPaid += payment.amount;
            break;
          case 'Spring Trip':
            totals.tripPaid += payment.amount;
            break;
          case 'Equipment':
            totals.equipmentPaid += payment.amount;
            break;
          case 'Donation':
            totals.donationsPaid += payment.amount;
            break;
        }
      }
    });
    
    // 5. Create cache data structure
    const cacheData: StripeCustomerCache = {
      customerId: user.stripeCustomerId,
      payments,
      totals,
      lastSync: new Date().toISOString()
    };
    
    // 6. Upsert to StripeCache table (single source of truth)
    await prisma.stripeCache.upsert({
      where: { userId },
      update: {
        data: JSON.parse(JSON.stringify(cacheData)),
        updatedAt: new Date()
      },
      create: {
        userId,
        data: JSON.parse(JSON.stringify(cacheData)),
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Synced Stripe data for user ${userId}: ${payments.length} payments`);
    return cacheData;
    
  } catch (error) {
    console.error(`❌ Failed to sync Stripe data for user ${userId}:`, error);
    return null;
  }
}