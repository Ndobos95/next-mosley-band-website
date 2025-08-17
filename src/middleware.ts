import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { parseHostname } from '@/lib/environment'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // Parse hostname to determine environment and routing
  const parsed = parseHostname(hostname)
  
  console.log('🔥 MIDDLEWARE:', {
    hostname,
    environment: parsed.environment,
    isTenant: parsed.isTenantRequest,
    tenant: parsed.tenantSlug,
    isMain: parsed.isMainSite,
    pathname
  })
  
  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return await updateSession(request)
  }
  
  // Reserved subdomain - redirect to main site
  if (parsed.isReserved) {
    console.log('⚠️ Reserved subdomain accessed:', hostname)
    if (parsed.environment === 'development') {
      // For local development, redirect to main localhost
      const url = request.nextUrl.clone()
      url.hostname = 'localhost'
      url.port = '3000'
      return NextResponse.redirect(url)
    } else {
      // For production/staging, use absolute URLs
      const mainUrl = parsed.environment === 'staging' 
        ? 'https://boostedband.dev'
        : 'https://boosted.band'
      return NextResponse.redirect(new URL(mainUrl))
    }
  }
  
  // Main site request
  if (parsed.isMainSite) {
    // Add environment header for the app to know which environment it's in
    const response = await updateSession(request)
    response.headers.set('x-environment', parsed.environment)
    return response
  }
  
  // Tenant request - validate tenant exists
  if (parsed.isTenantRequest && parsed.tenantSlug) {
    try {
      const apiUrl = new URL('/api/internal/tenant', request.url)
      apiUrl.searchParams.set('slug', parsed.tenantSlug)
      apiUrl.searchParams.set('environment', parsed.environment)
      
      console.log('📡 Fetching tenant:', parsed.tenantSlug, 'env:', parsed.environment)
      const response = await fetch(apiUrl.toString())
      const data = await response.json()
      
      if (!response.ok || !data.tenant) {
        console.log('❌ Unknown tenant:', parsed.tenantSlug)
        // Redirect to appropriate main site based on environment
        if (parsed.environment === 'development') {
          // For local development, redirect to main localhost
          const url = request.nextUrl.clone()
          url.hostname = 'localhost'
          url.port = '3000'
          return NextResponse.redirect(url)
        } else {
          // For production/staging, use absolute URLs
          const mainUrl = parsed.environment === 'staging'
            ? 'https://boostedband.dev'
            : 'https://boosted.band'
          return NextResponse.redirect(new URL(mainUrl))
        }
      }
      
      const tenant = data.tenant
      console.log('✅ Valid tenant:', tenant.slug, tenant.status, 'env:', parsed.environment)
    
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
      nextResponse.headers.set('x-environment', parsed.environment)
      
      return await updateSession(request, nextResponse)
      
    } catch (error) {
      console.error('🚨 Middleware API fetch error:', error)
      // On error, allow through but log
      const response = NextResponse.next()
      response.headers.set('x-tenant-slug', parsed.tenantSlug || '')
      response.headers.set('x-environment', parsed.environment)
      return await updateSession(request, response)
    }
  }
  
  // Default case - shouldn't reach here
  return await updateSession(request)
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