'use client'

import { useEffect, useState } from 'react'
import { parseHostname } from '@/lib/environment'

export function TenantIndicator() {
  const [tenantInfo, setTenantInfo] = useState<{
    environment: string
    tenant: string | null
    hostname: string
  } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const parsed = parseHostname(hostname + ':' + window.location.port)
      
      setTenantInfo({
        environment: parsed.environment,
        tenant: parsed.tenantSlug || (parsed.isMainSite ? 'Main Site' : 'Unknown'),
        hostname: window.location.host
      })
    }
  }, [])

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