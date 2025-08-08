import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from './drizzle'
import { tenants, connectedAccounts } from '@/db/schema'

export type TenantContext = {
  id: string
  slug: string
  connectedAccountId?: string | null
}

function getTenantSlugFromHost(host?: string | null): string | null {
  if (!host) return null
  const parts = host.split(':')[0].split('.')
  if (parts.length <= 2) return process.env.DEFAULT_TENANT_SLUG || null
  const [subdomain] = parts
  if (subdomain === 'www' || subdomain === 'app') return process.env.DEFAULT_TENANT_SLUG || null
  return subdomain
}

export async function resolveTenant(req: NextRequest): Promise<TenantContext | null> {
  const headers = req.headers
  const explicit = headers.get('x-tenant-slug')
  const host = headers.get('host')
  const slug = explicit || getTenantSlugFromHost(host) || process.env.DEFAULT_TENANT_SLUG || 'default'

  if (!db) throw new Error('Database not initialized')

  const tenant = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
  const tenantRow = tenant[0]
  if (!tenantRow) return null

  const ca = await db.select().from(connectedAccounts).where(eq(connectedAccounts.tenantId, tenantRow.id)).limit(1)
  return {
    id: tenantRow.id,
    slug: tenantRow.slug,
    connectedAccountId: ca[0]?.stripeAccountId ?? null,
  }
}

export function getRequestOrigin(req: NextRequest): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

export async function resolveTenantFromHeaders(hdrs: Headers): Promise<TenantContext | null> {
  const explicit = hdrs.get('x-tenant-slug')
  const host = hdrs.get('host')
  const slug = explicit || getTenantSlugFromHost(host) || process.env.DEFAULT_TENANT_SLUG || 'default'
  if (!db) throw new Error('Database not initialized')
  const tenant = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
  const tenantRow = tenant[0]
  if (!tenantRow) return null
  const ca = await db.select().from(connectedAccounts).where(eq(connectedAccounts.tenantId, tenantRow.id)).limit(1)
  return { id: tenantRow.id, slug: tenantRow.slug, connectedAccountId: ca[0]?.stripeAccountId ?? null }
}