/**
 * Tenant Context Utilities
 * Handles multi-tenant context extraction and validation
 */

import { createClient } from '@/lib/supabase/server'

// Re-export client-safe utilities
export { extractTenantSlugFromPath, buildTenantUrl } from './tenant-utils'

export interface TenantMembership {
  tenant_id: string
  slug: string
  role: string
}

/**
 * Decode JWT token to extract custom claims
 */
function decodeJWT(token: string): any {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode the payload (second part)
    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Get user's tenant memberships from JWT claims
 */
export async function getUserTenantMemberships(): Promise<TenantMembership[]> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return []
  }

  // Decode the JWT access token to get custom claims
  const jwtPayload = decodeJWT(session.access_token)

  if (!jwtPayload) {
    console.error('Failed to decode JWT payload')
    return []
  }

  console.log('🔍 Decoded JWT payload:', JSON.stringify(jwtPayload, null, 2))

  // Extract tenant_memberships from custom claims
  const memberships = jwtPayload.tenant_memberships || []

  return memberships as TenantMembership[]
}

/**
 * Check if user has access to a specific tenant slug
 */
export async function userHasAccessToTenant(tenantSlug: string): Promise<boolean> {
  const memberships = await getUserTenantMemberships()
  return memberships.some(m => m.slug === tenantSlug)
}

/**
 * Get user's membership details for a specific tenant
 */
export async function getUserTenantMembership(tenantSlug: string): Promise<TenantMembership | null> {
  const memberships = await getUserTenantMemberships()
  return memberships.find(m => m.slug === tenantSlug) || null
}

/**
 * Get redirect URL after login based on user's tenant memberships
 * Returns:
 *  - null if no memberships (should show error)
 *  - /{slug}/dashboard if single membership (auto-redirect)
 *  - /select-tenant if multiple memberships (show picker)
 */
export async function getPostLoginRedirect(): Promise<string | null> {
  const { buildTenantUrl: buildUrl } = await import('./tenant-utils')
  const memberships = await getUserTenantMemberships()

  if (memberships.length === 0) {
    return null // No access
  }

  if (memberships.length === 1) {
    // Auto-redirect to single tenant
    return buildUrl(memberships[0].slug, '/dashboard')
  }

  // Multiple tenants - show picker
  return '/select-tenant'
}

/**
 * Require tenant context from session (session-only approach)
 * This is the primary way to get tenant context in API routes and server components
 *
 * @param tenantSlug - Tenant slug from URL path
 * @throws Error if user not authenticated or doesn't have access to tenant
 */
export async function requireTenantFromSession(tenantSlug: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    throw new Error('Unauthorized: No active session')
  }

  // Decode JWT to get tenant memberships
  const jwtPayload = decodeJWT(session.access_token)
  const memberships = (jwtPayload?.tenant_memberships || []) as TenantMembership[]

  // Find matching membership
  const membership = memberships.find(m => m.slug === tenantSlug)

  if (!membership) {
    throw new Error(`Unauthorized: User does not have access to tenant "${tenantSlug}"`)
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email || '',
      role: session.user.role || null
    },
    tenant: {
      id: membership.tenant_id,
      slug: membership.slug,
      role: membership.role
    },
    membership
  }
}

/**
 * Get tenant context from session without throwing
 * Returns null if user not authenticated or doesn't have access
 */
export async function getTenantFromSession(tenantSlug: string) {
  try {
    return await requireTenantFromSession(tenantSlug)
  } catch {
    return null
  }
}
