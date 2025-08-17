// Legacy Better Auth route - replaced with Supabase Auth
// This route is no longer needed but kept to prevent 404s during migration

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    error: 'Auth route migrated to Supabase Auth',
    message: 'Please use Supabase Auth endpoints instead'
  }, { status: 410 }) // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: 'Auth route migrated to Supabase Auth',
    message: 'Please use Supabase Auth endpoints instead'
  }, { status: 410 }) // 410 Gone
}