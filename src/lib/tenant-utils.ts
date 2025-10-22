/**
 * Client-Safe Tenant Utilities
 * These functions can be used in both client and server components
 */

/**
 * Extract tenant slug from URL pathname
 * Examples:
 *   /mosley-band/dashboard -> "mosley-band"
 *   /mosley-band/students/123 -> "mosley-band"
 *   /login -> null
 */
export function extractTenantSlugFromPath(pathname: string): string | null {
  // Remove leading slash and split
  const segments = pathname.replace(/^\//, '').split('/')

  // Public routes (no tenant in path)
  const publicRoutes = ['login', 'register', 'signup', 'select-tenant', 'api', 'admin']

  if (segments.length === 0 || !segments[0]) {
    return null
  }

  // If first segment is a public route, no tenant slug
  if (publicRoutes.includes(segments[0])) {
    return null
  }

  // Otherwise, first segment is the tenant slug
  return segments[0]
}

/**
 * Build tenant-scoped URL
 */
export function buildTenantUrl(tenantSlug: string, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${tenantSlug}${normalizedPath}`
}
