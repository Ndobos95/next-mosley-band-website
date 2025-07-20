import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserPaymentHistory, syncStripeDataToUser } from '@/lib/stripe-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync latest data from Stripe first (t3dotgg pattern)
    await syncStripeDataToUser(session.user.id);
    
    // Get payment history for the user
    const payments = await getUserPaymentHistory(session.user.id);
    
    // Sort payments by date (newest first)
    const sortedPayments = payments.sort((a, b) => b.created - a.created);

    return NextResponse.json({ 
      payments: sortedPayments 
    });

  } catch (error) {
    console.error('Get payment history API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}