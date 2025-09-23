import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'


import LoginForm from './login-form'

async function getTenantFromHeaders() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const tenantSlug = headersList.get('x-tenant-slug')
  
  if (tenantId && tenantSlug) {
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
    
    return tenant[0] || null
  }
  
  return null
}

export default async function LoginPage() {
  const tenant = await getTenantFromHeaders()
  
  return <LoginForm tenant={tenant} />
}