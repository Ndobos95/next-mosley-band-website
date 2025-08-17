import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  const pathname = request.nextUrl.pathname
  
  console.log('🔥 MIDDLEWARE:', hostname, subdomain, pathname)
  
  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return await updateSession(request)
  }
  
  // Main site - localhost or boosted/www
  if (hostname.includes('localhost:') || subdomain === 'boosted' || subdomain === 'www' || subdomain === 'localhost') {
    return await updateSession(request)
  }
  
  // School subdomain - validate tenant via internal API
  try {
    const apiUrl = new URL('/api/internal/tenant', request.url)
    apiUrl.searchParams.set('slug', subdomain)
    
    console.log('📡 Fetching tenant:', subdomain)
    const response = await fetch(apiUrl.toString())
    const data = await response.json()
    
    if (!response.ok || !data.tenant) {
      console.log('❌ Unknown tenant:', subdomain)
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    const tenant = data.tenant
    console.log('✅ Valid tenant:', tenant.slug, tenant.status)
    
    // Check tenant status
    if (tenant.status === 'reserved') {
      return NextResponse.rewrite(new URL('/reserved', request.url))
    }
    
    if (tenant.status === 'pending') {
      if (!request.nextUrl.pathname.startsWith('/stripe/')) {
        return NextResponse.rewrite(new URL('/onboarding-incomplete', request.url))
      }
    }
    
    if (tenant.status !== 'active' && tenant.status !== 'pending') {
      return NextResponse.rewrite(new URL('/maintenance', request.url))
    }
    
    // Valid tenant - set context headers
    const nextResponse = NextResponse.next()
    nextResponse.headers.set('x-tenant-id', tenant.id)
    nextResponse.headers.set('x-tenant-slug', tenant.slug)
    nextResponse.headers.set('x-tenant-status', tenant.status)
    
    return await updateSession(request, nextResponse)
    
  } catch (error) {
    console.error('🚨 Middleware API fetch error:', error)
    // On error, allow through but log
    const response = NextResponse.next()
    response.headers.set('x-tenant-slug', subdomain)
    return await updateSession(request, response)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}