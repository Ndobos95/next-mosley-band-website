/**
 * Environment configuration for multi-tenant routing
 * Uses slug-based routing pattern: boosted.band/{tenant-slug}/...
 */

export type Environment = 'production' | 'staging' | 'development'

// Reserved slugs that can't be used as tenant names
export const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'app',
  'login', 'register', 'signup', 'select-tenant',
  'mail', 'blog', 'help', 'support',
  'waitlist', 'pricing', 'about', 'contact', 'careers',
  'cdn', 'assets', 'static', 'media', 'files', 'uploads',
  'email', 'mx', 'ns', 'dns', 'vpn', 'ssh',
  'dev', 'staging', 'test', 'beta', 'alpha', 'preview', 'sandbox',
  'dashboard', 'students', 'payments', 'settings', 'profile'
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
 * Generate a tenant URL for the current environment using slug-based routing
 * Examples:
 *  - production: https://boosted.band/mosley-band
 *  - staging: https://boostedband.dev/mosley-band
 *  - development: http://localhost:3000/mosley-band
 */
export function getTenantUrl(tenantSlug: string, path: string = '', environment: Environment = getCurrentEnvironment()): string {
  const baseUrl = getBaseUrl(environment)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}/${tenantSlug}${normalizedPath}`
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
 * Check if a slug is available for use as a tenant identifier
 */
export function isSlugAvailable(slug: string): boolean {
  // Check reserved list
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return false
  }

  // Must be alphanumeric with hyphens only
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
  if (!slugPattern.test(slug)) {
    return false
  }

  // Must be between 3-50 characters
  if (slug.length < 3 || slug.length > 50) {
    return false
  }

  return true
}