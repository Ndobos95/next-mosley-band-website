// Simple in-memory tenant cache - no Redis/DB imports
interface CachedTenant {
  id: string
  slug: string
  name: string
  status: string
  directorEmail: string | null
  directorName: string | null
}

// In-memory cache
const tenantCache = new Map<string, CachedTenant | null>()
const cacheTimestamps = new Map<string, number>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export class MemoryTenantCache {
  /**
   * Get tenant from memory cache
   * Returns undefined if not in cache, null if cached as non-existent, or the tenant object
   */
  static getTenant(slug: string): CachedTenant | null | undefined {
    const now = Date.now()
    const timestamp = cacheTimestamps.get(slug)
    
    // Not in cache at all
    if (!timestamp) {
      return undefined
    }
    
    // Check if cache is expired
    if ((now - timestamp) > CACHE_TTL) {
      tenantCache.delete(slug)
      cacheTimestamps.delete(slug)
      return undefined
    }
    
    // Return cached value (could be null for non-existent tenant)
    return tenantCache.get(slug)
  }
  
  /**
   * Set tenant in memory cache
   */
  static setTenant(slug: string, tenant: CachedTenant | null): void {
    tenantCache.set(slug, tenant)
    cacheTimestamps.set(slug, Date.now())
  }
  
  /**
   * Pre-populate cache with known tenants
   */
  static preload(tenants: CachedTenant[]): void {
    const now = Date.now()
    for (const tenant of tenants) {
      tenantCache.set(tenant.slug, tenant)
      cacheTimestamps.set(tenant.slug, now)
    }
    console.log(`Preloaded ${tenants.length} tenants to memory cache`)
  }
  
  /**
   * Cache negative result (tenant doesn't exist)
   */
  static setNotFound(slug: string): void {
    tenantCache.set(slug, null)
    cacheTimestamps.set(slug, Date.now())
  }
  
  /**
   * Get cache stats
   */
  static getStats() {
    return {
      size: tenantCache.size,
      tenants: Array.from(tenantCache.keys()),
    }
  }
}