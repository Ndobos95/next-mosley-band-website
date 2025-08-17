# Multi-Tenant Caching Strategy

## Overview
This document explains the caching strategy for multi-tenant SaaS operations in the Band Program platform.

## Architecture Decision: Memory Cache over Redis

After testing both Redis and in-memory caching, we chose **in-memory caching** for the following reasons:

### Why Not Redis?
1. **Edge Runtime Incompatibility**: Next.js middleware runs in Edge Runtime, which cannot use Node.js packages like `ioredis` or `pg`
2. **Additional Infrastructure**: Redis requires separate server management and costs
3. **Overkill for Small Scale**: For <100 tenants, Redis adds unnecessary complexity

### Why Memory Cache Works
1. **Edge Compatible**: Pure JavaScript, works in Edge Runtime
2. **Fast**: No network latency, microsecond lookups
3. **Simple**: No external dependencies or configuration
4. **Sufficient**: 5-minute TTL handles up to 100 tenants easily

## Implementation Details

### Components

1. **Middleware** (`src/middleware.ts`)
   - Intercepts all requests
   - Extracts subdomain from hostname
   - Calls internal API to validate tenant
   - Sets tenant context headers for downstream use

2. **Internal API** (`src/app/api/internal/tenant/route.ts`)
   - Edge-compatible endpoint for tenant lookup
   - Checks memory cache first
   - Falls back to database on cache miss
   - Caches results (including negative results)

3. **Memory Cache** (`src/lib/tenant-memory-cache.ts`)
   - Simple Map-based cache
   - 5-minute TTL for all entries
   - Three-state responses: found, not-found, or not-cached
   - Handles both positive and negative caching

### Cache Flow

```
Request → Middleware → Internal API → Memory Cache → Database
                ↓                           ↓
         Tenant Headers              Cache Update
```

### Cache States

The cache returns three possible states:
- **Tenant object**: Tenant exists and is cached
- **null**: Tenant doesn't exist (cached negative result)
- **undefined**: Not in cache, need to check database

### Configuration

- **TTL**: 5 minutes (configurable in `tenant-memory-cache.ts`)
- **Max Size**: Limited by available memory (~100 tenants = ~100KB)

## Production Considerations

### When to Upgrade to Redis/Upstash

Consider external caching when:
- You have >100 active tenants
- You need cache sharing across multiple servers
- You deploy to serverless environments with no persistent memory
- You need cache persistence across deployments

### Recommended Upgrade Path

1. **Upstash Redis** ($0-10/month)
   - Edge-compatible via HTTP API
   - No code changes to middleware needed
   - Simple migration from memory cache

2. **Cloudflare KV** (if using Cloudflare)
   - Native Edge Runtime support
   - Global distribution
   - Pay-per-use pricing

### Migration Steps

To migrate to Upstash:
1. Install `@upstash/redis` package
2. Update `tenant-memory-cache.ts` to use Upstash client
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars
4. No changes needed to middleware or API routes

## Testing

### Local Testing
```bash
# Test with subdomain
curl -H "Host: tenant-slug.localhost" http://localhost:3000

# Test API directly
curl http://localhost:3000/api/internal/tenant?slug=tenant-slug
```

### Cache Verification
- First request: "Cache MISS - querying database"
- Subsequent requests: "Cache HIT"
- After 5 minutes: "Cache MISS" again

## Monitoring

### Metrics to Track
- Cache hit rate (target: >90%)
- Database query frequency
- Response times for tenant lookup
- Memory usage (if using in-memory cache)

### Debug Logging
The system includes console logging for:
- Cache hits/misses
- Database queries
- Tenant validation results

Set `NODE_ENV=production` to disable debug logs.

## Security

- Tenant validation happens on every request
- Cache doesn't store sensitive data (only public tenant info)
- Negative caching prevents database DoS attacks
- Internal API only accessible from middleware