import { getSession } from './auth-server'
import { prisma } from './prisma'

/**
 * Get authenticated user and tenant context
 * Throws error if user is not authenticated or tenant not found
 */
export async function requireTenant() {
  const session = await getSession()

  if (!session) {
    throw new Error('Unauthorized: No active session')
  }

  // Get tenant from database
  const tenant = await prisma.tenants.findUnique({
    where: { id: session.user.tenantId }
  })

  if (!tenant) {
    throw new Error(`Tenant not found: ${session.user.tenantId}`)
  }

  return {
    user: session.user,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status
    }
  }
}

/**
 * Get auth context (user + tenant) without throwing
 * Returns null if not authenticated
 */
export async function getAuthContext() {
  try {
    return await requireTenant()
  } catch {
    return null
  }
}

/**
 * Legacy function - kept for backward compatibility
 * Use requireTenant() or getAuthContext() instead
 */
export const withAuth = requireTenant;