import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { parseHostname } from '@/lib/environment'
import { createClient } from '@/lib/supabase/server'

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
  
  // Skip middleware for static files only
  if (pathname.startsWith('/_next/')) {
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
    // Check if this is a non-public route that might need tenant redirection
    const publicRoutes = [
      '/',
      '/login', 
      '/register',
      '/signup',
      '/about',
      '/contact', 
      '/pricing',
      '/test-login'
    ]
    
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname.startsWith('/api/')
    )
    
    // For non-public routes, let the client-side enforcer handle redirection
    // This prevents server-side redirect loops and allows for proper user context checking
    const response = await updateSession(request)
    response.headers.set('x-environment', parsed.environment)
    response.headers.set('x-is-main-site', 'true')
    response.headers.set('x-is-public-route', isPublicRoute.toString())
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
      // For API routes, we need to pass tenant context differently
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.next({
          request: {
            headers: new Headers(request.headers),
          }
        })
        response.headers.set('x-tenant-id', tenant.id)
        response.headers.set('x-tenant-slug', tenant.slug)
        response.headers.set('x-tenant-status', tenant.status)
        response.headers.set('x-environment', parsed.environment)
        
        // Also try to set on the request for API routes
        request.headers.set('x-tenant-id', tenant.id)
        request.headers.set('x-tenant-slug', tenant.slug)
        
        return await updateSession(request, response)
      }
      
      // For non-API routes, set response headers
      const nextResponse = NextResponse.next()
      nextResponse.headers.set('x-tenant-id', tenant.id)
      nextResponse.headers.set('x-tenant-slug', tenant.slug)
      nextResponse.headers.set('x-tenant-status', tenant.status)
      nextResponse.headers.set('x-environment', parsed.environment)
      
      // Define routes that DON'T need tenant enforcement (public/global routes)
      const publicRoutes = [
        '/',
        '/login', 
        '/register',
        '/signup',
        '/about',
        '/contact', 
        '/pricing',
        '/test-login'
      ]
      
      const isPublicRoute = publicRoutes.some(route => 
        pathname === route
      )
      
      // ALL other routes need tenant enforcement for authenticated users
      const isProtectedRoute = !isPublicRoute
                              
      if (isProtectedRoute) {
        try {
          const supabaseResponse = await updateSession(request, nextResponse)
          const supabase = await createClient()
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            // Quick check: if user belongs to this tenant, continue
            // For performance, we'll let the client-side enforcer handle detailed validation
            console.log('🔒 MIDDLEWARE: Authenticated user on protected route', pathname, 'tenant:', tenant.slug)
          }
          
          return supabaseResponse
        } catch (error) {
          console.error('🚨 Middleware user context check error:', error)
          return await updateSession(request, nextResponse)
        }
      }
      
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