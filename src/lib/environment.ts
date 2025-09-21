/**
 * Environment configuration for multi-tenant routing
 * Handles production and staging environments with prefix pattern
 * 
 * Pattern:
 * - Production: riverside.boosted.band
 * - Staging: demo-riverside.boosted.band
 * - Staging main: demo.boosted.band
 */

export type Environment = 'production' | 'staging' | 'development'

interface ParsedHostname {
  environment: Environment
  isTenantRequest: boolean
  tenantSlug?: string
  isMainSite: boolean
  isReserved: boolean
}

// Reserved subdomains that can't be used as tenant names
export const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'app', 
  'demo', // Reserved for staging main site
  'mail', 'blog', 'help', 'support',
  'waitlist', 'pricing', 'about', 'contact', 'careers',
  'cdn', 'assets', 'static', 'media', 'files', 'uploads',
  'email', 'mx', 'ns', 'dns', 'vpn', 'ssh', 
  'dev', 'staging', 'test', 'beta', 'alpha', 'preview', 'sandbox'
]

/**
 * Determine environment from various sources
 */
export function getCurrentEnvironment(): Environment {
  // Check for explicit environment variable (highest priority)
  if (process.env.APP_ENV === 'staging') return 'staging'
  if (process.env.APP_ENV === 'production') return 'production'
  if (process.env.APP_ENV === 'development') return 'development'
  
  // Auto-detect based on domain (for simplicity)
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('boostedband.dev')) return 'staging'
    if (window.location.hostname.includes('boosted.band')) return 'production'
    if (window.location.hostname.includes('localhost')) return 'development'
  }
  
  // Vercel environment detection
  if (process.env.VERCEL_ENV === 'production') {
    // On Vercel, check the URL to determine environment
    if (process.env.VERCEL_URL?.includes('boostedband.dev')) {
      return 'staging'
    }
    return 'production'
  }
  
  if (process.env.VERCEL_ENV === 'preview') return 'staging'
  
  // NODE_ENV fallback (local development)
  if (process.env.NODE_ENV === 'development') return 'development'
  
  // Default to development for safety
  return 'development'
}

/**
 * Parse hostname to determine environment and tenant
 * 
 * Examples:
 * - boosted.band → production main site
 * - riverside.boosted.band → production tenant
 * - boostedband.dev → staging main site
 * - riverside.boostedband.dev → staging tenant
 * - riverside.localhost → development tenant
 */
export function parseHostname(hostname: string): ParsedHostname {
  // Remove port if present
  const host = hostname.split(':')[0].toLowerCase()
  const parts = host.split('.')
  
  // Development environment (localhost)
  if (host.includes('localhost')) {
    if (parts.length === 1 || parts[0] === 'localhost') {
      // localhost:3000 - main site
      return {
        environment: 'development',
        isTenantRequest: false,
        isMainSite: true,
        isReserved: false
      }
    }
    
    // tenant.localhost - tenant site
    const subdomain = parts[0]
    const isReserved = RESERVED_SUBDOMAINS.includes(subdomain)
    
    return {
      environment: 'development',
      isTenantRequest: !isReserved,
      tenantSlug: !isReserved ? subdomain : undefined,
      isMainSite: false,
      isReserved
    }
  }
  
  // Staging environment (boostedband.dev)
  if (host.includes('boostedband.dev')) {
    // Main domain (boostedband.dev or www.boostedband.dev)
    if (host === 'boostedband.dev' || host === 'www.boostedband.dev') {
      return {
        environment: 'staging',
        isTenantRequest: false,
        isMainSite: true,
        isReserved: false
      }
    }
    
    // Must be subdomain.boostedband.dev pattern
    if (parts.length === 3 && parts[1] === 'boostedband' && parts[2] === 'dev') {
      const subdomain = parts[0]
      const isReserved = RESERVED_SUBDOMAINS.includes(subdomain)
      
      // *.boostedband.dev - staging tenant or reserved
      return {
        environment: 'staging',
        isTenantRequest: !isReserved,
        tenantSlug: !isReserved ? subdomain : undefined,
        isMainSite: false,
        isReserved
      }
    }
  }
  
  // Production environment (boosted.band)
  if (host.includes('boosted.band')) {
    // Main domain (boosted.band or www.boosted.band)
    if (host === 'boosted.band' || host === 'www.boosted.band') {
      return {
        environment: 'production',
        isTenantRequest: false,
        isMainSite: true,
        isReserved: false
      }
    }
    
    // Must be subdomain.boosted.band pattern
    if (parts.length === 3 && parts[1] === 'boosted' && parts[2] === 'band') {
      const subdomain = parts[0]
      const isReserved = RESERVED_SUBDOMAINS.includes(subdomain)
      
      // *.boosted.band - production tenant or reserved
      return {
        environment: 'production',
        isTenantRequest: !isReserved,
        tenantSlug: !isReserved ? subdomain : undefined,
        isMainSite: false,
        isReserved
      }
    }
  }
  
  // Unknown pattern - treat as main site
  return {
    environment: 'development',
    isTenantRequest: false,
    isMainSite: true,
    isReserved: false
  }
}

/**
 * Get the base URL for the current environment
 */
export function getBaseUrl(environment: Environment = getCurrentEnvironment()): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  switch (environment) {
    case 'production':
      return 'https://boosted.band'
    case 'staging':
      return 'https://boostedband.dev'
    case 'development':
      return 'http://localhost:3000'
    default:
      return 'http://localhost:3000'
  }
}

/**
 * Generate a tenant URL for the current environment
 */
export function getTenantUrl(tenantSlug: string, environment: Environment = getCurrentEnvironment()): string {
  switch (environment) {
    case 'production':
      return `https://${tenantSlug}.boosted.band`
    case 'staging':
      return `https://${tenantSlug}.boostedband.dev`
    case 'development':
      return `http://${tenantSlug}.localhost:3000`
    default:
      return `http://${tenantSlug}.localhost:3000`
  }
}

/**
 * Get the appropriate database/tenant filter based on environment
 * Staging uses a separate database or tenant prefix
 */
export function getTenantFilter(environment: Environment = getCurrentEnvironment()): {
  prefix?: string
  databaseUrl?: string
} {
  if (environment === 'staging') {
    // Option 1: Use prefix for staging tenants
    return { prefix: 'demo-' }
    
    // Option 2: Use different database (uncomment if using separate DB)
    // return { databaseUrl: process.env.STAGING_DATABASE_URL }
  }
  
  return {}
}

/**
 * Check if a subdomain is available for use
 */
export function isSubdomainAvailable(subdomain: string): boolean {
  // Check reserved list
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return false
  }
  
  // Simple and clean - just check reserved list
  return true
}