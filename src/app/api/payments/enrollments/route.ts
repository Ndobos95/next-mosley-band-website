// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth, requireRole } from '@/lib/auth-server';
import { syncStripeDataToUser } from '@/lib/stripe-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync latest data from Stripe first (t3dotgg pattern)
    const syncResult = await syncStripeDataToUser(session.user.id);
    
    // Get enrollments directly from sync result instead of re-reading cache
    const enrollments = syncResult?.enrollments ?? {};

    return NextResponse.json({ 
      enrollments 
    });

  } catch (error) {
    console.error('Get enrollments API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}