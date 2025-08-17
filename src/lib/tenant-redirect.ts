import { parseHostname } from './environment'

/**
 * Get the appropriate redirect URL after login based on user's tenant
 * This is a client-side function that calls the server API
 */
export async function getLoginRedirectUrl(): Promise<string> {
  try {
    const response = await fetch('/api/auth/redirect-url', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      console.error('Failed to get redirect URL:', response.statusText)
      return '/dashboard'
    }
    
    const data = await response.json()
    return data.redirectUrl || '/dashboard'
    
  } catch (error) {
    console.error('Error getting login redirect URL:', error)
    return '/dashboard' // Fallback
  }
}

/**
 * Check if current location matches user's tenant
 */
export function isUserInCorrectTenant(hostname: string, userTenantSlug: string): boolean {
  const parsed = parseHostname(hostname)
  
  // If on main site, user should be redirected to their tenant
  if (parsed.isMainSite) {
    return false
  }
  
  // Check if current tenant matches user's tenant
  return parsed.tenantSlug === userTenantSlug
}