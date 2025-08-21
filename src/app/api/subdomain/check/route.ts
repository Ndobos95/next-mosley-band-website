import { NextRequest, NextResponse } from 'next/server'
import { isValidSubdomain } from '@/lib/tenant-context'
import { isSubdomainAvailable as checkAvailability, getCurrentEnvironment } from '@/lib/environment'
import { getTenantBySlug } from '@/lib/tenant-context'

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
    const environment = getCurrentEnvironment()
    
    // Check if subdomain is in reserved list or has invalid prefixes
    const formatAvailable = checkAvailability(subdomain)
    if (!formatAvailable) {
      return NextResponse.json({
        available: false,
        error: 'This subdomain is reserved or not allowed'
      })
    }
    
    // Check if subdomain already exists in database
    const existing = await getTenantBySlug(subdomain)
    const available = existing === null
    
    return NextResponse.json({
      available,
      error: available ? null : 'This subdomain is already taken'
    })
  } catch (error) {
    console.error('Error checking subdomain availability:', error)
    return NextResponse.json({
      available: false,
      error: 'Failed to check availability'
    })
  }
}