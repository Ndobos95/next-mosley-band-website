import { NextRequest, NextResponse } from 'next/server'
import { isSlugAvailable as checkSlugAvailability, getCurrentEnvironment } from '@/lib/environment'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const subdomain = searchParams.get('subdomain')

  if (!subdomain) {
    return NextResponse.json(
      { error: 'Subdomain parameter is required' },
      { status: 400 }
    )
  }

  try {
    const environment = getCurrentEnvironment()

    // Check if slug is valid and available (not reserved)
    const formatAvailable = checkSlugAvailability(subdomain)
    if (!formatAvailable) {
      return NextResponse.json({
        available: false,
        error: 'This slug is reserved or has an invalid format. Use 3-50 characters, lowercase letters, numbers, and hyphens only.'
      })
    }

    // Check if slug already exists in database
    const existing = await prisma.tenants.findUnique({
      where: { slug: subdomain }
    })
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