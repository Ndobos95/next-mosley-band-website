/**
 * Tenant Context Enforcer
 *
 * NOTE: This component is now deprecated.
 * Tenant validation is handled by middleware in src/middleware.ts instead.
 * Keeping this component for backwards compatibility but it does nothing.
 */
export function TenantContextEnforcer() {
  // Middleware handles all tenant validation now
  return null
}
