import { NextRequest, NextResponse } from 'next/server'
import { MemoryTenantCache } from '@/lib/tenant-memory-cache'
import { RedisCloudCache } from '@/lib/redis-cloud'
import { db } from '@/lib/drizzle'
import { tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const environment = searchParams.get('environment') || 'production'

  if (!slug) {
    return NextResponse.json({ error: 'Slug required' }, { status: 400 })
  }

  try {
    console.log('🔍 Internal API checking tenant:', slug, 'env:', environment)
    
    // Try Redis Cloud first (if available in production)
    const redisCached = await RedisCloudCache.getTenant(slug)
    if (redisCached !== undefined) {
      // Redis has the answer (either tenant object or null)
      if (redisCached === null) {
        console.log('🔴 Redis Cloud HIT (null):', slug)
        return NextResponse.json({ tenant: null })
      }
      console.log('🟢 Redis Cloud HIT:', slug)
      return NextResponse.json({ tenant: redisCached, source: 'redis' })
    }
    
    // Fallback to memory cache (for development or if Redis unavailable)
    const memoryCached = MemoryTenantCache.getTenant(slug)
    
    // Memory cache hit - tenant doesn't exist
    if (memoryCached === null) {
      console.log('💾 Memory Cache HIT (null):', slug)
      return NextResponse.json({ tenant: null })
    }
    
    // Memory cache hit - tenant exists
    if (memoryCached !== undefined) {
      console.log('💾 Memory Cache HIT:', slug)
      return NextResponse.json({ tenant: memoryCached, source: 'memory' })
    }
    
    // Both caches missed - query database
    console.log('💾 Cache MISS - querying database:', slug)
    
    const result = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)
    
    if (result.length === 0) {
      console.log('❌ Tenant not found in DB:', slug)
      // Cache the negative result in both caches
      await RedisCloudCache.setTenant(slug, null)
      MemoryTenantCache.setNotFound(slug)
      return NextResponse.json({ tenant: null })
    }
    
    // Found tenant in database
    const dbTenant = result[0]
    const tenant = {
      id: dbTenant.id,
      slug: dbTenant.slug,
      name: dbTenant.name,
      status: dbTenant.status,
      directorEmail: dbTenant.directorEmail,
      directorName: dbTenant.directorName,
    }
    
    console.log('✅ Found tenant in DB:', tenant.slug, tenant.status)
    // Cache in both Redis Cloud and memory
    await RedisCloudCache.setTenant(slug, tenant)
    MemoryTenantCache.setTenant(slug, tenant)
    
    return NextResponse.json({ tenant, source: 'database' })
    
  } catch (error) {
    console.error('🚨 Internal API error:', error)
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 })
  }
}