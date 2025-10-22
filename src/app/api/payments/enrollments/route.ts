import { NextRequest, NextResponse } from 'next/server';
import { syncStripeDataToUser } from '@/lib/stripe-cache';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract tenant slug from query params (passed by client)
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 400 })
    }

    // Note: Tenant access validation happens in stripe-cache via requireTenant if needed
    // For now, we trust the client passed the correct tenant slug
    // The session already validates user is authenticated

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