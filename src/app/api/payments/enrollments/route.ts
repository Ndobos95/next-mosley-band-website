import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserEnrollments } from '@/lib/stripe-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get enrollments for the user
    const enrollments = await getUserEnrollments(session.user.id);

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