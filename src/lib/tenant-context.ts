import { NextRequest } from 'next/server'
import { db } from '@/lib/drizzle'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

export interface Tenant {
  id: string
  slug: string
  name: string
  status: string
  directorEmail: string | null
  directorName: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Extract subdomain from hostname
 * Examples:
 * - lincoln-high.boosted.band -> lincoln-high
 * - boosted.band -> boosted (main site)
 * - localhost:3000 -> localhost (development)
 */
export function extractSubdomain(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // For development (localhost)
  if (host === 'localhost') return 'localhost'
  
  // Extract subdomain (first part before first dot)
  return host.split('.')[0]
}

/**
 * Check if this is the main site (boosted.band or www.boosted.band)
 */
export function isMainSite(subdomain: string): boolean {
  return subdomain === 'boosted' || subdomain === 'www' || subdomain === 'localhost'
}

/**
 * Get tenant by slug from database
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)

    return result[0] || null
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return null
  }
}

/**
 * Extract tenant context from request
 */
export async function getTenantFromRequest(request: NextRequest): Promise<Tenant | null> {
  const hostname = request.headers.get('host') || ''
  const subdomain = extractSubdomain(hostname)
  
  // Main site has no tenant
  if (isMainSite(subdomain)) return null
  
  return await getTenantBySlug(subdomain)
}

/**
 * Reserved subdomains that cannot be used by schools
 */
export const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 'mail', 'blog', 'help', 'support',
  'waitlist', 'demo', 'pricing', 'about', 'contact', 'careers',
  'cdn', 'assets', 'static', 'media', 'files', 'uploads', 'ftp',
  'email', 'mx', 'ns', 'dns', 'vpn', 'ssh', 'dev', 'staging',
  'test', 'beta', 'alpha', 'preview', 'sandbox'
]

/**
 * Check if subdomain is available for school use
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  // Check against reserved list
  if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
    return false
  }
  
  // Check against existing tenants
  const existing = await getTenantBySlug(subdomain)
  return existing === null
}

/**
 * Validate subdomain format
 */
export function isValidSubdomain(subdomain: string): boolean {
  // Must be 3-63 characters, alphanumeric and hyphens only
  // Cannot start or end with hyphen
  const regex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/
  return regex.test(subdomain.toLowerCase())
}