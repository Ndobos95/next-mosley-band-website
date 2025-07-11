// Helper functions for working with Stripe cache (t3dotgg pattern)

import { prisma } from '@/lib/prisma';
import type { StripeCustomerCache, PaymentTotals } from '@/types/stripe';

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
 * Placeholder for the core t3dotgg sync function
 * This will be implemented in Task 3
 */
export async function syncStripeDataToUser(userId: string): Promise<void> {
  // TODO: Implement in Task 3
  // 1. Get user's Stripe customer ID
  // 2. Fetch ALL customer data from Stripe API
  // 3. Transform into StripeCustomerCache format
  // 4. Upsert to StripeCache table
  console.log(`TODO: Sync Stripe data for user ${userId}`);
}