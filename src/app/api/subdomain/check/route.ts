import { NextRequest, NextResponse } from 'next/server'
import { isSubdomainAvailable, isValidSubdomain } from '@/lib/tenant-context'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subdomain = searchParams.get('subdomain')

  if (!subdomain) {
    return NextResponse.json(
      { error: 'Subdomain parameter is required' },
      { status: 400 }
    )
  }

  if (!isValidSubdomain(subdomain)) {
    return NextResponse.json({
      available: false,
      error: 'Invalid format. Use 3-63 characters, letters, numbers, and hyphens only.'
    })
  }

  try {
    const available = await isSubdomainAvailable(subdomain)
    
    return NextResponse.json({
      available,
      error: available ? null : 'This subdomain is not available'
    })
  } catch (error) {
    console.error('Error checking subdomain availability:', error)
    return NextResponse.json({
      available: false,
      error: 'Failed to check availability'
    })
  }
}