// Stripe configuration
import Stripe from 'stripe';

// Server-side Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Use Stripe's default pinned version. Remove invalid custom pin.
  typescript: true,
});