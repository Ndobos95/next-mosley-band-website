import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { extractTenantSlugFromPath } from '@/lib/tenant-utils'
import { createClient } from '@/lib/supabase/server'

/**
 * Simplified middleware - Session-only approach
 * Only handles authentication redirects, no tenant validation
 * Tenant access is validated in individual routes via requireTenantFromSession()
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Extract tenant slug from URL path
  const tenantSlug = extractTenantSlugFromPath(pathname)

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/signup',
    '/select-tenant',
    '/about',
    '/contact',
    '/pricing',
  ]

  const isPublicRoute = publicRoutes.includes(pathname) ||
                       pathname.startsWith('/api/') ||
                       pathname.startsWith('/admin/')

  // If accessing a tenant route, check authentication
  if (tenantSlug && !isPublicRoute) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // User is authenticated - let them through
    // Tenant access validation happens in route handlers via requireTenantFromSession()
  }

  // Update Supabase session and continue
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}