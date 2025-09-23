# Database Connection Guide: Supabase + Prisma

## Connection Types & When to Use Them

### 🔗 Connection Pooler (RECOMMENDED for Production)
**Benefits:**
- ✅ **Better for serverless** - Handles many short-lived connections efficiently
- ✅ **WSL2 compatible** - Uses IPv4, works in development environments
- ✅ **Reduced connection overhead** - Reuses existing connections
- ✅ **Built-in connection limits** - Prevents connection exhaustion
- ✅ **Automatic failover** - Better reliability than direct connections

**Use Cases:**
- Next.js applications (serverless functions)
- High-concurrency applications
- Development in WSL2 environments
- Production deployments on Vercel, Netlify, etc.

### 🎯 Direct Connection
**Benefits:**
- ✅ **Full PostgreSQL features** - No pooling limitations
- ✅ **Lower latency** - Direct to database (when reachable)

**Limitations:**
- ❌ **IPv6 only** - Unreachable in WSL2 environments
- ❌ **Connection limits** - Can exhaust database connections under load
- ❌ **Not serverless-friendly** - Each function creates new connections

## Environment-Specific Configuration

### WSL2 Development (Current Setup)
```env
# Use poolers for both - WSL2 can't reach IPv6 direct connections
DATABASE_URL="postgresql://postgres.gmmvcildftbdxsgvkyyr:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.gmmvcildftbdxsgvkyyr:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### Production (Serverless/Next.js)
```env
# Same as WSL2 - poolers are optimal for serverless
DATABASE_URL="postgresql://postgres.project:password@aws-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.project:password@aws-region.pooler.supabase.com:5432/postgres"
```

### Traditional Server (Optional Alternative)
```env
# Can use direct connection for migrations if IPv6 is available
DATABASE_URL="postgresql://postgres.project:password@aws-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
```

## Port Reference

| Port | Type | Use Case | WSL2 Compatible |
|------|------|----------|-----------------|
| 6543 | Transaction Pooler | Serverless queries | ✅ |
| 5432 | Session Pooler | Migrations, long sessions | ✅ |
| 5432 | Direct Database | Legacy/traditional servers | ❌ |

## Common Issues & Solutions

### "Network is unreachable" Error
- **Cause**: WSL2 trying to reach IPv6 direct connection
- **Solution**: Use pooler connections (`aws-region.pooler.supabase.com`)

### "Wrong password" / SCRAM Authentication Error
- **Cause**: WSL2 networking interfering with PostgreSQL auth
- **Solution**: Use pooler connections, they handle auth better

### "Can't reach database server"
- **Cause**: Prisma using direct connection URL in WSL2
- **Solution**: Set both `DATABASE_URL` and `DIRECT_URL` to pooler addresses

## Manual Database Access

### In WSL2 (Recommended)
```bash
npx prisma studio  # Visual database browser
```

### From Windows Host
```cmd
psql "postgresql://postgres.project:password@aws-region.pooler.supabase.com:5432/postgres"
```

### Supabase Dashboard
- Always available via web interface
- SQL Editor, Table Editor, etc.

## Production Considerations

### Connection Pooling Settings
- **Transaction Mode (Port 6543)**: Best for Next.js API routes
- **Session Mode (Port 5432)**: Required for migrations and admin scripts
- **pgbouncer=true**: Required for transaction mode to disable prepared statements

### Performance
- Poolers add ~1-2ms latency but prevent connection exhaustion
- Much better than direct connections under load
- Supabase's poolers are optimized and monitored

### Security
- All connections use SSL by default
- Poolers provide additional DDoS protection
- Connection credentials are managed by Supabase

## Migration Best Practices

1. **Always use Session Pooler (5432) for migrations**
2. **Use Transaction Pooler (6543) for application queries**
3. **Test migrations in development before production**
4. **Keep connection strings in environment variables**

## Future-Proof Rules

1. **In WSL2: Always use pooler connections**
2. **In Production: Use pooler connections for better scalability**
3. **Never hardcode connection strings**
4. **Use Prisma Studio instead of psql in WSL2**

---

**Last Updated**: September 2025
**Environment**: WSL2 + Supabase + Prisma + Next.js