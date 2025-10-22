import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { userHasAccessToTenant } from '@/lib/tenant-context'

interface TenantLayoutProps {
  children: ReactNode
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenantSlug } = await params

  // Middleware should have already validated access, but double-check
  const hasAccess = await userHasAccessToTenant(tenantSlug)

  if (!hasAccess) {
    // User doesn't have access to this tenant
    redirect('/select-tenant')
  }

  // Pass tenant slug down via context or props
  // For now, middleware sets it in headers which child pages can access
  return <>{children}</>
}
