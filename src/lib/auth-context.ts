import { prisma } from './prisma'
import { requireTenantFromSession, getTenantFromSession } from './tenant-context'

/**
 * Get authenticated user and tenant context (session-only approach)
 * Requires tenant slug to be passed explicitly (from URL params)
 *
 * @param tenantSlug - Tenant slug extracted from URL path
 * @throws Error if user is not authenticated or doesn't have access to tenant
 */
export async function requireTenant(tenantSlug: string) {
  // Get tenant context from session (validates JWT claims)
  const context = await requireTenantFromSession(tenantSlug)

  // Optionally verify tenant exists in database and get full details
  const tenant = await prisma.tenants.findUnique({
    where: { id: context.tenant.id }
  })

  if (!tenant) {
    throw new Error(`Tenant not found: ${context.tenant.id}`)
  }

  return {
    user: {
      id: context.user.id,
      email: context.user.email,
      tenantId: context.tenant.id // For backward compatibility
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status
    },
    membership: context.membership
  }
}

/**
 * Get auth context (user + tenant) without throwing
 * Returns null if not authenticated or doesn't have access
 */
export async function getAuthContext(tenantSlug: string) {
  try {
    return await requireTenant(tenantSlug)
  } catch {
    return null
  }
}

/**
 * Legacy function - kept for backward compatibility
 * Use requireTenant(tenantSlug) or getAuthContext(tenantSlug) instead
 */
export const withAuth = requireTenant;