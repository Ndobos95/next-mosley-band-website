'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { extractTenantSlugFromPath } from '@/lib/tenant-utils'
import { getCurrentEnvironment } from '@/lib/environment'

export function TenantIndicator() {
  const pathname = usePathname()
  const [tenantInfo, setTenantInfo] = useState<{
    environment: string
    tenant: string | null
    hostname: string
  } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tenantSlug = extractTenantSlugFromPath(pathname)
      const environment = getCurrentEnvironment()

      setTenantInfo({
        environment,
        tenant: tenantSlug || 'Main Site',
        hostname: window.location.host
      })
    }
  }, [pathname])

  if (!tenantInfo) return null

  // Don't show in production unless there's an issue
  if (tenantInfo.environment === 'production' && tenantInfo.tenant !== 'Unknown') {
    return null
  }

  const bgColor = {
    development: 'bg-blue-500',
    staging: 'bg-yellow-500',
    production: 'bg-red-500'
  }[tenantInfo.environment] || 'bg-gray-500'

  const envLabel = {
    development: 'DEV',
    staging: 'STAGING',
    production: 'PROD'
  }[tenantInfo.environment] || 'UNKNOWN'

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-3 py-2 rounded-lg shadow-lg z-50 text-xs font-mono`}>
      <div className="font-bold">{envLabel}</div>
      <div>Tenant: {tenantInfo.tenant}</div>
      <div className="text-xs opacity-75">{tenantInfo.hostname}</div>
    </div>
  )
}