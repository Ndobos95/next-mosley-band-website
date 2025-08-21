import Redis from 'ioredis'

// Redis Cloud client - configured automatically by Vercel integration
let redis: Redis | null = null

// Initialize Redis client lazily
function getRedisClient(): Redis | null {
  // Only initialize in Node.js runtime (not Edge)
  if (typeof window !== 'undefined') {
    return null
  }
  
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 2) return null
        return Math.min(times * 100, 2000)
      },
    })
    
    redis.on('error', (err) => {
      console.error('Redis Cloud error:', err)
    })
    
    redis.on('connect', () => {
      console.log('✅ Connected to Redis Cloud')
    })
  }
  
  return redis
}

export interface CachedTenant {
  id: string
  slug: string
  name: string
  status: string
  directorEmail: string | null
  directorName: string | null
}

// Cache TTL in seconds
const CacheTTL = {
  TENANT: 3600, // 1 hour
  TENANT_MISS: 300, // 5 minutes
} as const

export class RedisCloudCache {
  /**
   * Get tenant from Redis Cloud
   * Returns undefined if not cached, null if cached as non-existent
   */
  static async getTenant(slug: string): Promise<CachedTenant | null | undefined> {
    try {
      const client = getRedisClient()
      if (!client) {
        console.log('⚠️ Redis Cloud not available')
        return undefined
      }
      
      const cacheKey = `tenant:${slug}`
      const cached = await client.get(cacheKey)
      
      if (cached === 'not-found') {
        console.log('🔴 Redis Cloud HIT (null):', slug)
        return null
      }
      
      if (cached) {
        console.log('🟢 Redis Cloud HIT:', slug)
        return JSON.parse(cached)
      }
      
      console.log('⚪ Redis Cloud MISS:', slug)
      return undefined
    } catch (error) {
      console.error('Redis Cloud get error:', error)
      return undefined
    }
  }
  
  /**
   * Cache tenant in Redis Cloud
   */
  static async setTenant(slug: string, tenant: CachedTenant | null): Promise<void> {
    try {
      const client = getRedisClient()
      if (!client) return
      
      const cacheKey = `tenant:${slug}`
      const value = tenant ? JSON.stringify(tenant) : 'not-found'
      const ttl = tenant ? CacheTTL.TENANT : CacheTTL.TENANT_MISS
      
      await client.setex(cacheKey, ttl, value)
      console.log(`📝 Cached in Redis Cloud: ${slug} (TTL: ${ttl}s)`)
    } catch (error) {
      console.error('Redis Cloud set error:', error)
    }
  }
  
  /**
   * Invalidate tenant cache
   */
  static async invalidateTenant(slug: string): Promise<void> {
    try {
      const client = getRedisClient()
      if (!client) return
      
      await client.del(`tenant:${slug}`)
      console.log(`🗑️ Invalidated Redis Cloud cache: ${slug}`)
    } catch (error) {
      console.error('Redis Cloud invalidate error:', error)
    }
  }
  
  /**
   * Clear all tenant cache
   */
  static async clearAll(): Promise<void> {
    try {
      const client = getRedisClient()
      if (!client) return
      
      const keys = await client.keys('tenant:*')
      if (keys.length > 0) {
        await client.del(...keys)
        console.log(`🗑️ Cleared ${keys.length} tenants from Redis Cloud`)
      }
    } catch (error) {
      console.error('Redis Cloud clear error:', error)
    }
  }
  
  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const client = getRedisClient()
      if (!client) return false
      
      await client.ping()
      return true
    } catch {
      return false
    }
  }
}