import { prisma } from './prisma'
import { NextRequest } from 'next/server'

/**
 * Resolve tenant from Next.js request
 * Used in API routes and middleware
 */
export async function resolveTenant(request: NextRequest) {
  // Extract subdomain from hostname
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]

  // Check if subdomain matches a tenant slug
  const tenant = await prisma.tenants.findUnique({
    where: { slug: subdomain },
    select: { id: true, slug: true, name: true }
  })

  return tenant
}

/**
 * Get request origin for redirect URLs
 */
export function getRequestOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

/**
 * Resolve tenant from Next.js headers (for server components)
 * This is a simplified version that defaults to the 'default' tenant
 */
export async function resolveTenantFromHeaders(headers: Headers) {
  const hostname = headers.get('host') || ''
  const subdomain = hostname.split('.')[0]

  // Try to find tenant by subdomain slug
  let tenant = await prisma.tenants.findUnique({
    where: { slug: subdomain },
    select: { id: true, slug: true, name: true }
  })

  // If not found, try 'default' tenant (fallback for development)
  if (!tenant && (subdomain === 'localhost' || subdomain.includes('localhost'))) {
    tenant = await prisma.tenants.findUnique({
      where: { slug: 'default' },
      select: { id: true, slug: true, name: true }
    })
  }

  return tenant
}